# Porting log

Port of The Liquid Fire's Unity [Tactics RPG](https://theliquidfire.com/category/projects/tactics-rpg/)
tutorial (`packages/tactics-rpg`) to Threlte + SvelteKit. Conventions live in `AGENTS.md`.

The author's [blogtacticsrpg](https://github.com/theliquidfire/blogtacticsrpg) repo has one commit
per blog post (its "Part N" is our part N+1 up to Victory Conditions; Intro To A.I. had no commit),
and its last commit is identical to `packages/tactics-rpg`. Use it to see which files a part adds
and what they looked like at that point.

## Parts

Status: ⬜ todo · 🟨 in progress · ✅ done · ➖ nothing to port. 🛑 = milestone (pause for review).

| #   | Part                                                                                               | Status | Notes                                                            |
| --- | -------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------- |
| 0   | Setup (tooling, SPA, Vitest, docs)                                                                 | ✅     | Not a blog post.                                                 |
| 1   | [Series Intro](https://theliquidfire.com/2015/05/04/tactics-rpg-series-intro/)                     | ➖     |                                                                  |
| 2   | [Project Setup](https://theliquidfire.com/2015/05/11/tactics-rpg-project-setup/)                   | ✅     | Assets, materials, prefabs.                                      |
| 3   | [Board Generator](https://theliquidfire.com/2015/05/18/tactics-rpg-board-generator/)               | ✅ 🛑  | `Level_0` renders via `Tile`/`Board`; editor deferred.           |
| 4   | [User Input Controller](https://theliquidfire.com/2015/05/24/user-input-controller/)               | ✅     | Wired to the battle in part 5.                                   |
| 5   | [State Machine](https://theliquidfire.com/2015/06/01/tactics-rpg-state-machine/)                   | ✅     | Part-5 `MoveTargetState`; the rest arrives with later parts.     |
| 6   | [Path Finding](https://theliquidfire.com/2015/06/08/tactics-rpg-path-finding/)                     | ✅ 🛑  | Part-6 demo loop: pick any of 3 test heroes (walk/fly/teleport). |
| 7   | [Anchored UI](https://theliquidfire.com/2015/06/22/tactics-rpg-anchored-ui/)                       | ⬜     | `<Panel>` only; demo scene dropped.                              |
| 8   | [Conversations](https://theliquidfire.com/2015/06/29/tactics-rpg-conversations/)                   | ⬜     |                                                                  |
| 9   | [Ability Menu](https://theliquidfire.com/2015/07/13/ability-menu/)                                 | ⬜ 🛑  |                                                                  |
| 10  | [Stats](https://theliquidfire.com/2015/07/27/tactics-rpg-stats/)                                   | ⬜     |                                                                  |
| 11  | [Items and Equipment](https://theliquidfire.com/2015/08/03/tactics-rpg-items-and-equipment/)       | ⬜     |                                                                  |
| 12  | [Jobs](https://theliquidfire.com/2015/08/10/tactics-rpg-jobs/)                                     | ⬜     | Jobs generated from `Settings/*.csv`.                            |
| 13  | [Stat Panel](https://theliquidfire.com/2015/08/17/tactics-rpg-stat-panel/)                         | ⬜ 🛑  |                                                                  |
| 14  | [Ability Range](https://theliquidfire.com/2015/08/24/tactics-rpg-ability-range/)                   | ⬜     |                                                                  |
| 15  | [Ability Area of Effect](https://theliquidfire.com/2015/08/31/tactics-rpg-ability-area-of-effect/) | ⬜     |                                                                  |
| 16  | [Turn Order](https://theliquidfire.com/2015/09/07/tactics-rpg-turn-order/)                         | ⬜ 🛑  |                                                                  |
| 17  | [Status Effects](https://theliquidfire.com/2015/09/14/tactics-rpg-status-effects/)                 | ⬜     |                                                                  |
| 18  | [Hit Rate](https://theliquidfire.com/2015/09/21/tactics-rpg-hit-rate/)                             | ⬜     |                                                                  |
| 19  | [Ability Effects](https://theliquidfire.com/2015/10/12/tactics-rpg-ability-effects/)               | ⬜     |                                                                  |
| 20  | [Magic](https://theliquidfire.com/2015/10/19/tactics-rpg-magic/)                                   | ⬜ 🛑  |                                                                  |
| 21  | [Unit Factory](https://theliquidfire.com/2015/11/02/tactics-rpg-unit-factory/)                     | ⬜     |                                                                  |
| 22  | [Victory Conditions](https://theliquidfire.com/2015/11/16/tactics-rpg-victory-conditions/)         | ⬜ 🛑  |                                                                  |
| 23  | [Intro To A.I.](https://theliquidfire.com/2015/11/30/tactics-rpg-intro-to-a-i/)                    | ⬜     |                                                                  |
| 24  | [A.I. Part 1](https://theliquidfire.com/2015/12/07/tactics-rpg-a-i-part-1/)                        | ⬜     |                                                                  |
| 25  | [A.I. Part 2](https://theliquidfire.com/2015/12/21/tactics-rpg-a-i-part-2/)                        | ⬜ 🛑  | Add Playwright e2e for a full battle.                            |
| 26  | [Music](https://theliquidfire.com/2016/12/12/tactics-rpg-music/)                                   | ⬜ 🛑  | Transcode WAV → m4a; CC-BY credit.                               |

## File map

Unity (`packages/tactics-rpg/Assets/…`) → port (`packages/threlte-tactics/…`). Filled in as parts
land.

| Unity                                                       | Port                                                                                    | Part |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------- | ---- |
| `Materials/*.mat`                                           | `src/lib/materials/materials.ts`                                                        | 2    |
| `Textures/Dirt.png`                                         | `src/lib/assets/textures/Dirt.png`                                                      | 2    |
| `Textures/UI/*.png` (+ `.meta` 9-slices)                    | `src/lib/assets/textures/ui/` (`sprites.ts`)                                            | 2    |
| `Prefabs/Tile.prefab`                                       | `src/lib/components/prefabs/Tile.svelte`                                                | 2    |
| `Resources/Units/{Hero,Monster}.prefab`                     | `src/lib/components/prefabs/UnitModel.svelte`                                           | 2    |
| `Prefabs/Tile Selection Indicator.prefab`                   | `src/lib/components/prefabs/TileSelectionIndicator.svelte`                              | 2    |
| `Scripts/Common/Animation/*` (tweening)                     | `src/lib/common/animation/Tweener.ts` + `Transform` methods, on `svelte/motion` `Tween` | 6    |
| Unity's left-handed coordinate system                       | `src/lib/common/unity/` (`<UnityWorld>`, `unityEuler`)                                  | 2    |
| `Scripts/Model/Point.cs`                                    | `src/lib/model/Point.ts`                                                                | 3    |
| `Scripts/Model/LevelData.cs`                                | `src/lib/model/LevelData.ts`                                                            | 3    |
| `Scripts/View Model Component/Tile.cs`                      | `src/lib/view-model-component/Tile.svelte.ts`                                           | 3    |
| `Scripts/View Model Component/Board.cs`                     | `src/lib/view-model-component/Board.svelte.ts`                                          | 3    |
| `Resources/Levels/*.asset`                                  | `src/lib/resources/Levels/*.ts` (generated)                                             | 3    |
| `Resources.Load`                                            | `src/lib/common/unity/Resources.ts`                                                     | 3    |
| `Battle.unity`: Board                                       | `src/lib/components/BoardView.svelte`                                                   | 3    |
| `Battle.unity`: Camera Rig (transforms)                     | `src/lib/components/CameraRig.svelte`                                                   | 3    |
| `Battle.unity`: Directional Light                           | `src/lib/components/Lighting.svelte`                                                    | 3    |
| `Battle.unity`: scene, skybox                               | `src/lib/components/Battle.svelte`, `BattleScene.svelte`                                | 3    |
| `Scripts/Controller/InputController.cs`                     | `src/lib/controller/InputController.ts`, `src/lib/components/Input.svelte`              | 4    |
| `ProjectSettings/InputManager.asset`                        | `axes`, `buttons` in `src/lib/controller/InputController.ts`                            | 4    |
| `Scripts/EventArgs/InfoEventArgs.cs`                        | Not ported: input callbacks receive the value directly                                  | 4    |
| `Scripts/Common/State Machine/*.cs`                         | `runic-svelte-fsm`, created in `src/lib/controller/BattleController.svelte.ts`          | 5    |
| `Scripts/Controller/BattleController.cs`                    | `src/lib/controller/BattleController.svelte.ts`                                         | 5    |
| `Scripts/Controller/Battle States/BattleState.cs`           | `src/lib/controller/battle-states/BattleState.ts`                                       | 5    |
| `Scripts/Controller/Battle States/InitBattleState.cs`       | `src/lib/controller/battle-states/InitBattleState.ts`                                   | 5    |
| `Scripts/Controller/Battle States/MoveTargetState.cs`       | `src/lib/controller/battle-states/MoveTargetState.ts`                                   | 5    |
| `Scripts/View Model Component/CameraRig.cs`                 | `src/lib/components/CameraRig.svelte`                                                   | 5    |
| Coroutine yields (`null`, `WaitForSeconds`)                 | `src/lib/common/unity/time.ts`                                                          | 5    |
| `Battle.unity`: Battle Controller, Tile Selection Indicator | `src/lib/components/BattleScene.svelte`                                                 | 5    |
| `Scripts/Enums/Directions.cs`                               | `src/lib/enums/Directions.ts`                                                           | 6    |
| `Scripts/Extensions/DirectionsExtensions.cs`                | `src/lib/extensions/DirectionsExtensions.ts`                                            | 6    |
| `Scripts/View Model Component/Unit.cs`                      | `src/lib/view-model-component/Unit.svelte.ts`, `src/lib/components/UnitView.svelte`     | 6    |
| `Scripts/View Model Component/Movement/*.cs`                | `src/lib/view-model-component/movement/*.ts`                                            | 6    |
| `Scripts/Controller/Battle States/SelectUnitState.cs`       | `src/lib/controller/battle-states/SelectUnitState.ts`                                   | 6    |
| `Scripts/Controller/Battle States/MoveSequenceState.cs`     | `src/lib/controller/battle-states/MoveSequenceState.ts`                                 | 6    |
| `Transform` (position, rotation, scale)                     | `src/lib/common/unity/Transform.svelte.ts`                                              | 6    |
| `Mathf.Approximately`                                       | `src/lib/common/unity/mathf.ts`                                                         | 6    |

## Divergences

Every `// PORT-FIX:` and every intentional behavioural difference from Unity.

| Where                | What                                                                                            | Why                                                       |
| -------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Lighting / colors    | Gamma space mimicked (color management off, linear output).                                     | Unity project uses Gamma color space.                     |
| `Lighting.svelte`    | Skybox ambient approximated with ambient + hemisphere lights.                                   | Tuned by eye against footage of the Unity build.          |
| `Battle.svelte`      | Default skybox → fixed CSS gradient behind the canvas.                                          | The battle camera never rotates.                          |
| `UnitModel.svelte`   | Hero and Monster prefabs are one component with a `model` prop.                                 | They differ only by body material.                        |
| `Point.ts`           | Points are interned (`Point.of`), not structs.                                                  | `===` equality; usable as `Map` keys.                     |
| `InputController.ts` | Fire1 = Enter/Space, Fire2 = Escape/Backspace, Fire3 unbound (Unity: left ctrl/alt/cmd, mouse). | Keyboard only; Unity's keys clash with browser shortcuts. |
| `CameraRig.svelte`   | Snaps to its target once less than 1e-4 units away.                                             | Unity lerps forever; this lets on-demand rendering idle.  |

## Backlog (after parity)

- Board Creator at `/dev/board-creator` (Unity `Board Creator.unity`, `BoardCreator.cs`,
  `Editor/BoardCreatorInspector.cs`). `Tile.grow`/`shrink` are already ported.
- GodotTactics extras: orbit/zoom camera, i18n (en/ja/es), knockback/earthquake effects,
  cross/diagonal ranges, JSON map saves.
- Mouse/touch/gamepad input, mobile layout.
- CI.
