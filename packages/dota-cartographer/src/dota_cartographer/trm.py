"""Dota tree map (`maps/<map>.trm`): every tree position, tagged with the world layer it spawns in.

There is no public spec and ValveResourceFormat doesn't parse it. This layout was worked out from the
7.3x `dota.vpk` and matches every `ent_dota_tree` in the entity lumps:

    char[4]  magic "trmp"
    u32      version (1)
    u32      offset of the layer-name table (64)
    u32      layer count
    u32      tree count
    ...      zero padding up to the name table
    char[]   layer names, NUL-terminated, `layer count` of them; "" is the map's default layer
    struct { i32 x; i32 y; i32 layer; }[tree count], straight after the names

Tree positions are game units, snapped to the 64-unit grid's corners.
"""

from __future__ import annotations

import struct
from dataclasses import dataclass
from pathlib import Path

MAGIC = b"trmp"
_HEADER = struct.Struct("<4sIIII")
_TREE = struct.Struct("<iii")


@dataclass(frozen=True)
class Tree:
    x: int
    y: int
    layer: int  # index into TreeMap.layers


@dataclass(frozen=True)
class TreeMap:
    version: int
    layers: tuple[str, ...]
    trees: tuple[Tree, ...]


def parse(data: bytes) -> TreeMap:
    if len(data) < _HEADER.size:
        raise ValueError(f"tree map is {len(data)} bytes, shorter than its {_HEADER.size}-byte header")
    magic, version, names_at, layer_count, tree_count = _HEADER.unpack_from(data)
    if magic != MAGIC:
        raise ValueError(f"not a tree map: magic {magic!r}, expected {MAGIC!r}")
    if version != 1:
        raise ValueError(f"unsupported tree map version {version} (only 1 is known)")
    if not _HEADER.size <= names_at <= len(data):
        raise ValueError(f"tree map layer table offset {names_at} is outside the file")

    layers: list[str] = []
    at = names_at
    for _ in range(layer_count):
        end = data.find(b"\0", at)
        if end < 0:
            raise ValueError(f"tree map layer name {len(layers)} is not NUL-terminated")
        layers.append(data[at:end].decode("utf-8"))
        at = end + 1

    end = at + tree_count * _TREE.size
    if end != len(data):
        raise ValueError(f"tree map with {tree_count} trees should end at byte {end}, file has {len(data)}")
    trees = tuple(Tree(x, y, layer) for x, y, layer in _TREE.iter_unpack(data[at:end]))
    bad = next((t for t in trees if not 0 <= t.layer < layer_count), None)
    if bad is not None:
        raise ValueError(
            f"tree at ({bad.x}, {bad.y}) has layer {bad.layer}, but there are {layer_count} layers"
        )
    return TreeMap(version, tuple(layers), trees)


def read(path: Path) -> TreeMap:
    return parse(path.read_bytes())
