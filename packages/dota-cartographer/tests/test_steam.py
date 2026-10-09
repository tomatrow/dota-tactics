from pathlib import Path

import pytest

from dota_cartographer import steam


def test_finds_dota_in_an_extra_library(tmp_path: Path):
    root, library = tmp_path / "Steam", tmp_path / "Games Drive"
    (root / "steamapps").mkdir(parents=True)
    (root / "steamapps/libraryfolders.vdf").write_text(
        f'"libraryfolders"\n{{\n\t"0"\n\t{{\n\t\t"path"\t\t"{root}"\n\t}}\n'
        f'\t"1"\n\t{{\n\t\t"path"\t\t"{library}"\n\t}}\n}}\n'
    )
    vpk = library / steam.DOTA_MAP
    vpk.parent.mkdir(parents=True)
    vpk.write_bytes(b"")
    assert steam.library_folders(root) == [root, library]
    assert steam.find_dota_vpk([root]) == vpk


def test_lists_where_it_looked(tmp_path: Path):
    with pytest.raises(FileNotFoundError, match="pass --vpk"):
        steam.find_dota_vpk([tmp_path])
