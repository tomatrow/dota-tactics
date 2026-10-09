import numpy as np

from dota_cartographer.grid import Grid, quantise, tree_mask


def test_covering_snaps_outwards_to_whole_cells():
    grid = Grid.covering(64, (-100.0, -64.0), (130.0, 64.0))
    assert grid == Grid(64, (-128, -64), 5, 2)


def test_cell_of_uses_half_open_cells():
    grid = Grid(64, (-128, -64), 4, 2)
    assert grid.cell_of(-128, -64) == (0, 0)
    assert grid.cell_of(-64.01, 0) == (0, 1)
    assert grid.cell_of(-64, 0) == (1, 1)
    assert grid.cell_of(128, 0) is None


def test_centres():
    xs, ys = Grid(64, (-128, -64), 4, 2).centres()
    assert xs.tolist() == [-96, -32, 32, 96]
    assert ys.tolist() == [-32, 32]


def test_trees_block_the_2x2_cells_around_their_corner():
    grid = Grid(64, (0, 0), 4, 4)
    mask = tree_mask(grid, [(128, 128), (0, 256)])  # an inner corner, and the north-west corner
    assert mask.astype(int)[::-1].tolist() == [  # printed north-up
        [1, 0, 0, 0],
        [0, 1, 1, 0],
        [0, 1, 1, 0],
        [0, 0, 0, 0],
    ]


def test_off_corner_trees_snap_to_the_nearest_corner():
    grid = Grid(64, (0, 0), 3, 3)
    assert np.array_equal(tree_mask(grid, [(70, 60)]), tree_mask(grid, [(64, 64)]))


def test_quantise_rounds_halves_up_and_keeps_missing_ground():
    h = np.array([-256.0, 0.0, 63.9, 64.0, 128.0, 320.0, np.nan])
    assert quantise(h, 128, 0)[:-1].tolist() == [-2, 0, 0, 1, 1, 3]
    assert np.isnan(quantise(h, 128, 0)[-1])
