# Porting log

Port of The Liquid Fire's Unity [Tactics RPG](https://theliquidfire.com/category/projects/tactics-rpg/)
tutorial (`packages/tactics-rpg`) to Threlte + SvelteKit. Conventions live in `AGENTS.md`.

## Parts

Status: ⬜ todo · 🟨 in progress · ✅ done · ➖ nothing to port. 🛑 = milestone (pause for review).

| #   | Part                                                                                               | Status | Notes                                                 |
| --- | -------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------- |
| 0   | Setup (tooling, SPA, Vitest, docs)                                                                 | ✅     | Not a blog post.                                      |
| 1   | [Series Intro](https://theliquidfire.com/2015/05/04/tactics-rpg-series-intro/)                     | ➖     |                                                       |
| 2   | [Project Setup](https://theliquidfire.com/2015/05/11/tactics-rpg-project-setup/)                   | ⬜     | Folder layout, assets, materials.                     |
| 3   | [Board Generator](https://theliquidfire.com/2015/05/18/tactics-rpg-board-generator/)               | ⬜ 🛑  | Render `Level_0` via `Tile`/`Board`; editor deferred. |
| 4   | [User Input Controller](https://theliquidfire.com/2015/05/24/user-input-controller/)               | ⬜     |                                                       |
| 5   | [State Machine](https://theliquidfire.com/2015/06/01/tactics-rpg-state-machine/)                   | ⬜     |                                                       |
| 6   | [Path Finding](https://theliquidfire.com/2015/06/08/tactics-rpg-path-finding/)                     | ⬜ 🛑  |                                                       |
| 7   | [Anchored UI](https://theliquidfire.com/2015/06/22/tactics-rpg-anchored-ui/)                       | ⬜     | `<Panel>` only; demo scene dropped.                   |
| 8   | [Conversations](https://theliquidfire.com/2015/06/29/tactics-rpg-conversations/)                   | ⬜     |                                                       |
| 9   | [Ability Menu](https://theliquidfire.com/2015/07/13/ability-menu/)                                 | ⬜ 🛑  |                                                       |
| 10  | [Stats](https://theliquidfire.com/2015/07/27/tactics-rpg-stats/)                                   | ⬜     |                                                       |
| 11  | [Items and Equipment](https://theliquidfire.com/2015/08/03/tactics-rpg-items-and-equipment/)       | ⬜     |                                                       |
| 12  | [Jobs](https://theliquidfire.com/2015/08/10/tactics-rpg-jobs/)                                     | ⬜     | Jobs generated from `Settings/*.csv`.                 |
| 13  | [Stat Panel](https://theliquidfire.com/2015/08/17/tactics-rpg-stat-panel/)                         | ⬜ 🛑  |                                                       |
| 14  | [Ability Range](https://theliquidfire.com/2015/08/24/tactics-rpg-ability-range/)                   | ⬜     |                                                       |
| 15  | [Ability Area of Effect](https://theliquidfire.com/2015/08/31/tactics-rpg-ability-area-of-effect/) | ⬜     |                                                       |
| 16  | [Turn Order](https://theliquidfire.com/2015/09/07/tactics-rpg-turn-order/)                         | ⬜ 🛑  |                                                       |
| 17  | [Status Effects](https://theliquidfire.com/2015/09/14/tactics-rpg-status-effects/)                 | ⬜     |                                                       |
| 18  | [Hit Rate](https://theliquidfire.com/2015/09/21/tactics-rpg-hit-rate/)                             | ⬜     |                                                       |
| 19  | [Ability Effects](https://theliquidfire.com/2015/10/12/tactics-rpg-ability-effects/)               | ⬜     |                                                       |
| 20  | [Magic](https://theliquidfire.com/2015/10/19/tactics-rpg-magic/)                                   | ⬜ 🛑  |                                                       |
| 21  | [Unit Factory](https://theliquidfire.com/2015/11/02/tactics-rpg-unit-factory/)                     | ⬜     |                                                       |
| 22  | [Victory Conditions](https://theliquidfire.com/2015/11/16/tactics-rpg-victory-conditions/)         | ⬜ 🛑  |                                                       |
| 23  | [Intro To A.I.](https://theliquidfire.com/2015/11/30/tactics-rpg-intro-to-a-i/)                    | ⬜     |                                                       |
| 24  | [A.I. Part 1](https://theliquidfire.com/2015/12/07/tactics-rpg-a-i-part-1/)                        | ⬜     |                                                       |
| 25  | [A.I. Part 2](https://theliquidfire.com/2015/12/21/tactics-rpg-a-i-part-2/)                        | ⬜ 🛑  | Add Playwright e2e for a full battle.                 |
| 26  | [Music](https://theliquidfire.com/2016/12/12/tactics-rpg-music/)                                   | ⬜ 🛑  | Transcode WAV → m4a; CC-BY credit.                    |

## File map

Unity (`packages/tactics-rpg/Assets/…`) → port (`packages/threlte-tactics/…`). Filled in as parts
land.

| Unity | Port | Part |
| ----- | ---- | ---- |

## Divergences

Every `// PORT-FIX:` and every intentional behavioural difference from Unity.

| Where | What | Why |
| ----- | ---- | --- |

## Backlog (after parity)

- Board Creator at `/dev/board-creator` (Unity `Board Creator.unity`, `BoardCreator.cs`).
- GodotTactics extras: orbit/zoom camera, i18n (en/ja/es), knockback/earthquake effects,
  cross/diagonal ranges, JSON map saves.
- Mouse/touch/gamepad input, mobile layout.
- CI.
