import numpy as np
import trimesh

from dota_cartographer.grid import Grid
from dota_cartographer.terrain import Meshes, sample

from .fixtures import slab


def test_samples_topmost_ground_cliffs_and_water():
    # West half at z=0 with a water surface at z=40, east half at z=128; nothing north of y=128.
    ground = trimesh.util.concatenate([slab(-128, 0, -128, 128, 0.0), slab(0, 128, -128, 128, 128.0)])
    assert isinstance(ground, trimesh.Trimesh)
    water = slab(-128, 0, -128, 128, 40.0)
    grid = Grid(64, (-128, -128), 4, 5)

    t = sample(Meshes(ground, water), grid)

    assert t.height[0].tolist() == [0, 0, 128, 128]
    assert np.isnan(t.height[4]).all()  # off the mesh
    # samples on a vertical step hit its top, so only the low side's cell sees the 128-unit jump
    assert t.height_range[0].tolist() == [0, 128, 0, 0]
    assert t.water[0].tolist() == [True, True, False, False]
    assert not t.water[4].any()


def test_no_water_mesh_means_no_water():
    ground = slab(-64, 64, -64, 64, 0.0)
    t = sample(Meshes(ground, None), Grid(64, (-64, -64), 2, 2))
    assert not t.water.any()
    assert t.height.tolist() == [[0, 0], [0, 0]]
