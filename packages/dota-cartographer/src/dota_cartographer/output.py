"""Write JSON that diffs well: one grid row, tree, entity or lane per line; everything else compact."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

# How many container levels to spread over lines under each top-level key (0 = one line).
EXPAND = {"meta": 1, "layers": 2, "trees": 1, "entities": 1, "lanes": 1}


def _compact(value: Any) -> str:
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def _format(value: Any, indent: str, levels: int) -> str:
    if levels <= 0 or not isinstance(value, dict | list) or not value:
        return _compact(value)
    inner = indent + "  "
    if isinstance(value, dict):
        items = [f"{inner}{_compact(k)}: {_format(v, inner, levels - 1)}" for k, v in value.items()]
        return "{\n" + ",\n".join(items) + "\n" + indent + "}"
    items = [inner + _format(v, inner, levels - 1) for v in value]
    return "[\n" + ",\n".join(items) + "\n" + indent + "]"


def dumps(doc: dict[str, Any]) -> str:
    items = [f"  {_compact(k)}: {_format(v, '  ', EXPAND.get(k, 0))}" for k, v in doc.items()]
    return "{\n" + ",\n".join(items) + "\n}\n"


def write(path: Path, doc: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dumps(doc), encoding="utf-8")
