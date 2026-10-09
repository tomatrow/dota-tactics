import numpy as np
import pytest

from dota_cartographer import gnv, trm

from .fixtures import gnv_bytes, trm_bytes


class TestGridNav:
    def test_reads_header_and_cells_south_first(self):
        cells = np.array([[1, 0, 16], [17, 1, 20]], np.uint8)  # row 0 = south
        nav = gnv.parse(gnv_bytes(cells, min_cell=(-2, -1)))
        assert nav.edge == 64
        assert nav.offset == (32.0, 32.0)
        assert nav.min_cell == (-2, -1)
        assert (nav.width, nav.height) == (3, 2)
        assert nav.cells.tolist() == cells.tolist()

    def test_crop_pads_cells_outside_the_file_with_empty(self):
        cells = np.array([[1, 2], [3, 4]], np.uint8)
        nav = gnv.parse(gnv_bytes(cells, min_cell=(0, 0)))
        assert nav.crop(-1, 0, 3, 3).tolist() == [[0, 1, 2], [0, 3, 4], [0, 0, 0]]

    def test_traversable_bounds_are_world_units(self):
        cells = np.zeros((3, 4), np.uint8)
        cells[1, 1] = cells[2, 2] = gnv.GnvFlag.TRAVERSABLE
        nav = gnv.parse(gnv_bytes(cells, min_cell=(-2, -1)))
        # cols 1..2 -> world cells -1..0, rows 1..2 -> world cells 0..1
        assert nav.traversable_bounds() == ((-64, 0), (64, 128))

    def test_rejects_wrong_magic(self):
        data = bytearray(gnv_bytes(np.ones((1, 1), np.uint8)))
        data[0] ^= 0xFF
        with pytest.raises(ValueError, match="magic"):
            gnv.parse(bytes(data))

    def test_rejects_truncated_cells(self):
        with pytest.raises(ValueError, match="needs"):
            gnv.parse(gnv_bytes(np.ones((2, 2), np.uint8))[:-1])


class TestTreeMap:
    def test_reads_layers_and_trees(self):
        data = trm_bytes(["radiant_base", "dire_base", ""], [(-6080, -7168, 2), (64, 128, 0)])
        tm = trm.parse(data)
        assert tm.version == 1
        assert tm.layers == ("radiant_base", "dire_base", "")
        assert [(t.x, t.y, t.layer) for t in tm.trees] == [(-6080, -7168, 2), (64, 128, 0)]

    def test_rejects_trailing_bytes(self):
        with pytest.raises(ValueError, match="should end"):
            trm.parse(trm_bytes([""], [(0, 0, 0)]) + b"\0")

    def test_rejects_unknown_layer_index(self):
        with pytest.raises(ValueError, match="layer 5"):
            trm.parse(trm_bytes([""], [(0, 0, 5)]))

    def test_rejects_other_versions(self):
        data = bytearray(trm_bytes([""], []))
        data[4] = 2
        with pytest.raises(ValueError, match="version 2"):
            trm.parse(bytes(data))
