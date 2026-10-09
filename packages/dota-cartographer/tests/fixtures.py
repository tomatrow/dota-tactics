"""Tiny synthetic inputs in the real file formats."""

from __future__ import annotations

import struct

import numpy as np
import trimesh
from numpy.typing import NDArray

from dota_cartographer import gnv


def gnv_bytes(cells: NDArray[np.uint8], edge: float = 64.0, min_cell: tuple[int, int] = (-2, -1)) -> bytes:
    rows, cols = cells.shape
    header = struct.pack("<Ifffiiii", gnv.MAGIC, edge, edge / 2, edge / 2, cols, rows, *min_cell)
    return header + cells.astype(np.uint8).tobytes()


def trm_bytes(layers: list[str], trees: list[tuple[int, int, int]], names_at: int = 64) -> bytes:
    header = struct.pack("<4sIIII", b"trmp", 1, names_at, len(layers), len(trees))
    header += b"\0" * (names_at - len(header))
    names = b"".join(name.encode() + b"\0" for name in layers)
    return header + names + b"".join(struct.pack("<iii", *t) for t in trees)


def slab(x0: float, x1: float, y0: float, y1: float, top: float) -> trimesh.Trimesh:
    """A box from z = top - 64 up to z = top."""
    box = trimesh.creation.box(extents=(x1 - x0, y1 - y0, 64.0))
    box.apply_translation(((x0 + x1) / 2, (y0 + y1) / 2, top - 32.0))
    return box


LUMP = '''====0====
classname                      "worldspawn"
_dotatilegrid_stepheight       "128"
_dotatilegrid_minheight        "0"
_dotatilegrid_maxheight        "1024"
_dotatilegrid_heightshift      "0"
origin                         [ 0.0, 0.0, 0.0 ]

====1====
classname                      "dota_minimap_boundary"
origin                         [ -128.0, -64.0, -512.0 ]

====2====
classname                      "dota_minimap_boundary"
origin                         [ 128.0, 64.0, 1536.0 ]

====3====
classname                      "npc_dota_tower"
targetname                     "[PR#]dota_goodguys_tower1_top"
mapunitname                    "npc_dota_goodguys_tower1_top"
teamnumber                     "2"
model                          resource_name:"models/props_structures/radiant_tower002.vmdl"
origin                         [ -96.0, -32.0, 128.0 ]
angles                         [ 0.0, -90.0, 0.0 ]

====4====
classname                      "npc_dota_tower"
targetname                     "[PR#]dota_badguys_tower4_bot"
mapunitname                    "npc_dota_badguys_tower4"
teamnumber                     "3"
origin                         [ 96.0, 32.0, 256.0 ]

====5====
classname                      "npc_dota_barracks"
targetname                     "[PR#]good_rax_melee_mid"
mapunitname                    "npc_dota_goodguys_melee_rax_mid"
teamnumber                     "0"
origin                         [ -32.0, 32.0, 128.0 ]
pathnoderadiusscales           """
[
\t192.0, 150.0,
]
"""

====6====
classname                      "npc_dota_neutral_spawner"
neutraltype                    "3"
origin                         [ 10.0, 10.0, 128.0 ]

====7====
classname                      "ent_dota_tree"
origin                         [ 0.0, 0.0, 128.0 ]

====8====
classname                      "info_particle_system"
origin                         [ 0.0, 0.0, 0.0 ]

====9====
classname                      "npc_dota_something_new"
targetname                     "[PR#]new_thing"
origin                         [ 64.0, 0.0, 128.0 ]

====10====
classname                      "path_corner"
targetname                     "[PR#]lane_top_pathcorner_goodguys_1"
target                         "[PR#]lane_top_pathcorner_goodguys_2"
origin                         [ -100.0, 0.0, 128.0 ]

====11====
classname                      "path_corner"
targetname                     "[PR#]lane_top_pathcorner_goodguys_2"
target                         "[PR#]lane_top_pathcorner_goodguys_2"
origin                         [ 0.0, 50.0, 128.0 ]

====12====
classname                      "path_corner"
targetname                     "[PR#]roshan_midpoint"
target                         ""
origin                         [ 0.0, 0.0, 0.0 ]

====13====
classname                      "ent_dota_shop"
shoptype                       "2"
teamnumber                     "0"
origin                         [ 0.0, -32.0, 128.0 ]
'''
