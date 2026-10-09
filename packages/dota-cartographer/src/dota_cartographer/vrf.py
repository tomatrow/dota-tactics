"""The pinned Source 2 Viewer CLI (ValveResourceFormat) and the map extraction it does for us.

https://github.com/ValveResourceFormat/ValveResourceFormat — downloaded once into the tools folder and
checked against the release's SHA-256 digests.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
import urllib.request
import zipfile
from dataclasses import dataclass
from pathlib import Path

VERSION = "20.0"
RELEASE_URL = "https://github.com/ValveResourceFormat/ValveResourceFormat/releases/download/{version}/{asset}"
# (system, machine) -> (release asset, sha256), from the GitHub release's asset digests.
ASSETS = {
    ("Darwin", "arm64"): (
        "cli-macos-arm64.zip",
        "fa3fc51ab8ed8c96899a64cf8977c2c4810342605868f37044e85a412ff4e0cd",
    ),
    ("Darwin", "x86_64"): (
        "cli-macos-x64.zip",
        "9b430e8233fa498c34c00cf5cf4da48d854c8f255b1208557861802d9e16a19c",
    ),
    ("Linux", "x86_64"): (
        "cli-linux-x64.zip",
        "3e8af47cd6ce52e8068904f2aa1dda23c56a6b96a8310b25090f0711cda76a8a",
    ),
    ("Linux", "aarch64"): (
        "cli-linux-arm64.zip",
        "adcfeac823e25ebdaebe0b6c4b3132546afa3978d23fca37bb522da1fe5cb2e5",
    ),
    ("Windows", "AMD64"): (
        "cli-windows-x64.zip",
        "d32ab327b8bbb42a2528866afb03bb582bdb779d0005488da32b90292afd3ff5",
    ),
    ("Windows", "ARM64"): (
        "cli-windows-arm64.zip",
        "df2a52372fee1ce8284abd2cd8a09f65e7259778290b5facfcfa07ef75f4ea1a",
    ),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def ensure(tools: Path) -> Path:
    """Path to the CLI executable, downloading and verifying it first if needed."""
    system = platform.system()
    home = tools / f"vrf-{VERSION}"
    exe = home / ("Source2Viewer-CLI.exe" if system == "Windows" else "Source2Viewer-CLI")
    if exe.is_file():
        return exe

    key = (system, platform.machine())
    if key not in ASSETS:
        raise RuntimeError(f"no pinned Source 2 Viewer CLI build for {key}; add one to vrf.ASSETS")
    asset, expected = ASSETS[key]
    url = RELEASE_URL.format(version=VERSION, asset=asset)
    home.mkdir(parents=True, exist_ok=True)
    archive = home / asset
    print(f"Downloading Source 2 Viewer CLI {VERSION} ({asset})...", flush=True)
    with urllib.request.urlopen(url) as response, archive.open("wb") as f:
        shutil.copyfileobj(response, f)
    actual = sha256(archive)
    if actual != expected:
        archive.unlink()
        raise RuntimeError(f"{asset} SHA-256 is {actual}, expected {expected}")
    with zipfile.ZipFile(archive) as z:
        z.extractall(home)
    archive.unlink()
    if not exe.is_file():
        raise RuntimeError(f"{asset} did not contain {exe.name}")
    exe.chmod(0o755)
    if system == "Darwin":
        # urllib downloads aren't quarantined, but clear it in case the folder was copied from a browser.
        subprocess.run(["xattr", "-dr", "com.apple.quarantine", str(home)], check=False, capture_output=True)
    return exe


def run(exe: Path, *args: str) -> str:
    result = subprocess.run([str(exe), *args], capture_output=True, text=True, check=False)
    if result.returncode != 0:
        tail = "\n".join((result.stdout + result.stderr).strip().splitlines()[-20:])
        raise RuntimeError(f"Source 2 Viewer CLI failed ({result.returncode}): {' '.join(args)}\n{tail}")
    return result.stdout


def version(exe: Path) -> str:
    m = re.search(r"^Version:\s*(\S+)", run(exe, "--version"), re.MULTILINE)
    return m.group(1) if m else "unknown"


@dataclass(frozen=True)
class Extracted:
    map_name: str
    gnv: Path
    trm: Path
    entities: tuple[Path, ...]
    physics: Path


def _folder(path: Path) -> str:
    # With a single matching file, VRF treats an output path without a trailing separator as a file name.
    return str(path) + os.sep


def extract(exe: Path, vpk: Path, work: Path) -> Extracted:
    """Pull the GridNav, tree map, entity lumps and collision mesh out of a map VPK into `work`.

    Reuses a previous extraction into the same folder (the caller keys it by the VPK's hash).
    """
    manifest = work / "extracted.json"
    if manifest.is_file():
        saved = json.loads(manifest.read_text())
        found = Extracted(
            saved["map_name"],
            work / saved["gnv"],
            work / saved["trm"],
            tuple(work / p for p in saved["entities"]),
            work / saved["physics"],
        )
        if all(p.is_file() for p in (found.gnv, found.trm, found.physics, *found.entities)):
            return found
    if work.exists():
        shutil.rmtree(work)
    work.mkdir(parents=True)

    run(exe, "-i", str(vpk), "-e", "gnv,trm", "-o", _folder(work))
    gnvs = sorted(work.glob("maps/*.gnv"))
    if len(gnvs) != 1:
        raise RuntimeError(f"expected one maps/*.gnv in {vpk.name}, found {[p.name for p in gnvs]}")
    name = gnvs[0].stem
    trm = work / "maps" / f"{name}.trm"
    if not trm.is_file():
        raise RuntimeError(f"{vpk.name} has no maps/{name}.trm tree map")

    run(exe, "-i", str(vpk), "-e", "vents_c", "-d", "-o", _folder(work))
    entities = tuple(sorted((work / "maps" / name / "entities").glob("*.vents")))
    if not entities:
        raise RuntimeError(f"{vpk.name} has no maps/{name}/entities/*.vents_c entity lumps")

    physics_model = f"maps/{name}/world_physics.vmdl_c"
    run(exe, "-i", str(vpk), "-f", physics_model, "-d", "--gltf_export_format", "glb", "-o", _folder(work))
    physics = work / "maps" / name / "world_physics_physics.glb"
    if not physics.is_file():
        raise RuntimeError(f"exporting {physics_model} did not produce {physics.relative_to(work)}")

    found = Extracted(name, gnvs[0], trm, entities, physics)
    manifest.write_text(
        json.dumps(
            {
                "map_name": name,
                "gnv": str(found.gnv.relative_to(work)),
                "trm": str(found.trm.relative_to(work)),
                "entities": [str(p.relative_to(work)) for p in found.entities],
                "physics": str(found.physics.relative_to(work)),
            },
            indent=2,
        )
    )
    return found
