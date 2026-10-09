import pytest

from dota_cartographer import entities

from .fixtures import LUMP


@pytest.fixture
def ents() -> list[entities.Entity]:
    return entities.parse_lump(LUMP, "default_ents")


def by_name(markers: list[entities.Marker], name: str) -> entities.Marker:
    return next(m for m in markers if m.name == name)


def test_parses_blocks_values_and_multiline_values(ents: list[entities.Entity]):
    assert len(ents) == 14
    tower = ents[3]
    assert tower.classname == "npc_dota_tower"
    assert tower.name == "dota_goodguys_tower1_top"  # [PR#] stripped
    assert tower.origin == (-96.0, -32.0, 128.0)
    assert tower.yaw == -90.0
    assert tower.text("model") == "models/props_structures/radiant_tower002.vmdl"
    assert ents[5].keys["pathnoderadiusscales"] == "[\n\t192.0, 150.0,\n]"
    assert ents[5].keys["origin"] == "[ -32.0, 32.0, 128.0 ]"


def test_rejects_unterminated_multiline_value():
    with pytest.raises(ValueError, match="never ends"):
        entities.parse_lump('====0====\nkey """\n[\n', "x")


def test_world_settings(ents: list[entities.Entity]):
    assert entities.tile_grid(ents) == entities.TileGrid(128, 0, 1024, 0)
    bounds = entities.map_bounds(ents)
    assert bounds == entities.Bounds((-128.0, -64.0), (128.0, 64.0), "dota_minimap_boundary")
    assert entities.tree_positions(ents) == {(0, 0)}


def test_markers_keep_gameplay_entities_with_kinds(ents: list[entities.Entity]):
    markers = entities.markers(ents)
    kinds = sorted(m.kind for m in markers)
    # trees, particles and path corners are dropped; the unknown npc_dota_ class passes through
    assert kinds == ["barracks", "neutral_camp", "npc_dota_something_new", "shop", "tower", "tower"]


def test_marker_teams_and_extras(ents: list[entities.Entity]):
    markers = entities.markers(ents)
    t1 = by_name(markers, "dota_goodguys_tower1_top")
    assert (t1.team, t1.extras, t1.yaw) == ("radiant", {"tier": 1, "lane": "top"}, 270.0)
    t4 = by_name(markers, "dota_badguys_tower4_bot")
    assert (t4.team, t4.extras) == ("dire", {"tier": 4})  # lane comes from the unit name, which has none
    rax = by_name(markers, "good_rax_melee_mid")
    assert (rax.team, rax.extras) == ("radiant", {"lane": "mid", "type": "melee"})  # team 0, from names
    camp = next(m for m in markers if m.kind == "neutral_camp")
    assert (camp.team, camp.extras) == ("none", {"size": "ancient"})
    shop = next(m for m in markers if m.kind == "shop")
    assert shop.extras == {"shop": "secret"}


def test_lanes_follow_targets_and_stop_at_self_loops(ents: list[entities.Entity]):
    lanes = entities.lanes(ents)
    assert lanes == [entities.Lane("top", "radiant", ((-100.0, 0.0, 128.0), (0.0, 50.0, 128.0)))]


def test_tile_grid_requires_worldspawn_keys():
    with pytest.raises(ValueError, match="stepheight"):
        entities.tile_grid(entities.parse_lump('====0====\nclassname "worldspawn"\n', "x"))
