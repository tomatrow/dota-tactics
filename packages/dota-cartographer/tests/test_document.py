import json

import numpy as np

from dota_cartographer import assemble, entities, gnv, output, trm
from dota_cartographer.terrain import Meshes

from .fixtures import LUMP, gnv_bytes, slab, trm_bytes


def build() -> dict:
    # GridNav covering the minimap boundary (-128..128 x -64..64): 4x2 cells, all traversable but one.
    cells = np.ones((2, 4), np.uint8)
    cells[1, 3] = gnv.GnvFlag.WARD_BLOCKING
    nav = gnv.parse(gnv_bytes(cells, min_cell=(-2, -1)))
    trees = trm.parse(trm_bytes(["radiant_base", ""], [(0, 0, 1), (0, 0, 1), (-128, 64, 0)]))
    ents = entities.parse_lump(LUMP, "default_ents")
    meshes = Meshes(slab(-128, 128, -64, 64, 128.0), None)
    data = assemble.assemble(nav, trees, ents, meshes)
    return assemble.document(data, {"vpk": "test.vpk"})


def test_document_layers_match_the_grid():
    doc = build()
    assert doc["grid"] == {"cell": 64, "origin": [-128, -64], "cols": 4, "rows": 2}
    layers = doc["layers"]
    assert set(layers) == {"height", "heightRange", "level", "walkable", "water", "tree", "gnv"}
    for rows in layers.values():
        assert len(rows) == 2 and all(len(row) == 4 for row in rows)
    assert layers["height"] == [[128] * 4] * 2
    assert layers["level"] == [[1] * 4] * 2
    assert layers["walkable"] == [[1, 1, 1, 1], [1, 1, 1, 0]]
    assert layers["tree"] == [[0, 1, 1, 0], [1, 1, 1, 0]]
    assert doc["meta"]["levels"] == {"ground": [1, 1], "walkable": [1, 1]}


def test_document_trees_entities_and_lanes():
    doc = build()
    assert doc["treeLayers"] == ["radiant_base", None]
    assert doc["trees"] == [[0, 0, 1], [-128, 64, 0]]  # duplicate dropped, sorted south to north
    t1 = next(e for e in doc["entities"] if e["name"] == "dota_goodguys_tower1_top")
    assert t1 == {
        "kind": "tower",
        "class": "npc_dota_tower",
        "name": "dota_goodguys_tower1_top",
        "unit": "npc_dota_goodguys_tower1_top",
        "team": "radiant",
        "x": -96,
        "y": -32,
        "z": 128,
        "yaw": 270,
        "cell": [0, 0],
        "tier": 1,
        "lane": "top",
    }
    assert doc["lanes"] == [{"lane": "top", "team": "radiant", "points": [[-100, 0, 128], [0, 50, 128]]}]


def test_json_round_trips_with_one_row_per_line():
    doc = build()
    text = output.dumps(doc)
    assert json.loads(text) == doc
    lines = text.splitlines()
    assert "      [128,128,128,128]," in lines  # a height row on its own line
    assert sum(line.lstrip().startswith('{"kind":') for line in lines) == len(doc["entities"])
