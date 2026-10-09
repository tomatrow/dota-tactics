"""dota-cartographer: dota.vpk -> out/dota_map.json + out/preview.png."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import assemble, entities, gnv, output, preview, report, steam, terrain, trm, vrf


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="dota-cartographer", description=__doc__)
    parser.add_argument("--vpk", type=Path, help="map VPK (default: dota.vpk in your Steam library)")
    parser.add_argument("--out", type=Path, default=Path("out"), help="output folder (default: out)")
    parser.add_argument("--work", type=Path, default=Path("work"), help="extraction cache (default: work)")
    parser.add_argument("--tools", type=Path, default=Path(".tools"), help="VRF CLI folder (default: .tools)")
    args = parser.parse_args(argv)
    try:
        return run(args)
    except (OSError, RuntimeError, ValueError) as error:
        print(f"\nerror: {error}", file=sys.stderr)
        return 1


def run(args: argparse.Namespace) -> int:
    vpk: Path = args.vpk or steam.find_dota_vpk()
    if not vpk.is_file():
        raise FileNotFoundError(f"{vpk} is not a file")
    digest = vrf.sha256(vpk)
    print(f"Map: {vpk} (sha256 {digest[:12]})", flush=True)

    exe = vrf.ensure(args.tools)
    vrf_version = vrf.version(exe)
    print(f"Extracting with Source 2 Viewer CLI {vrf_version}...", flush=True)
    files = vrf.extract(exe, vpk, args.work / digest[:16])

    print("Sampling terrain and building layers...", flush=True)
    ents = entities.read_lumps(files.entities)
    data = assemble.assemble(gnv.read(files.gnv), trm.read(files.trm), ents, terrain.load(files.physics))
    source = {"vpk": vpk.name, "sha256": digest, "map": files.map_name, "vrf": vrf_version}

    json_path, png_path = args.out / "dota_map.json", args.out / "preview.png"
    output.write(json_path, assemble.document(data, source))
    preview.render(data, png_path)

    lines, warnings = report.summarise(data, entities.tree_positions(ents))
    size = json_path.stat().st_size / 1e6
    print(f"\nWrote {json_path} ({size:.1f} MB) and {png_path}")
    print("\n".join(lines))
    if warnings:
        print("\nWarnings:")
        print("\n".join(f"  ! {w}" for w in warnings))
    return 0


if __name__ == "__main__":
    sys.exit(main())
