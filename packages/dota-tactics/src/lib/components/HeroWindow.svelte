<!--
	The player's hero, bottom centre: HP, MP and CT, its statuses, its abilities on Q W E (click or
	press; greyed when it can't use them), what it's doing, its gold, last hits and denies, and the
	respawn countdown while it's dead. Refreshed every tick.
-->
<script lang="ts">
	import type { Ability } from "#lib/content/abilities.ts"
	import { STATUS_IDS, STATUSES } from "#lib/content/statuses.ts"
	import { getGameState } from "#lib/game/GameState.svelte.ts"
	import { GAUGE_FULL, TICK_RATE } from "#lib/sim/constants.ts"
	import type { Order } from "#lib/sim/unit.ts"

	const KEYS = ["Q", "W", "E"]

	const game = getGameState()

	function doing(order: Order, target: string | null): string {
		switch (order.type) {
			case "idle":
				return "Waiting"
			case "move":
				return "Moving"
			case "attack":
				return `Attacking ${order.target.name}`
			case "attackMove":
				return target ? `Attack-moving: ${target}` : "Attack-moving"
			case "ability": {
				const { ability, aim } = order
				if (aim.kind === "unit") return `${ability.name} → ${aim.unit.name}`
				return aim.kind === "tile" ? `${ability.name} → ground` : ability.name
			}
		}
	}

	/** What a left-click picks for an ability. */
	const prompt = (ability: Ability) =>
		`${ability.name}: left-click ${ability.target === "tile" ? "a tile or an enemy" : "an enemy"}`

	const info = $derived.by(() => {
		void game.tick
		const unit = game.hero
		const hero = unit.hero
		if (!hero) return null
		const targeting = game.targeting
		const { world } = game
		const casting = unit.casting
		return {
			name: unit.name,
			alive: unit.alive,
			respawn: Math.max(0, Math.ceil((hero.respawnAt - game.tick) / TICK_RATE)),
			hp: unit.hp,
			maxHp: unit.stats.hp,
			mp: unit.mp,
			maxMp: unit.stats.mp,
			gauge: Math.floor((unit.gauge / GAUGE_FULL) * 100),
			gold: hero.gold,
			lastHits: hero.lastHits,
			denies: hero.denies,
			doing:
				casting ?
					`Casting ${casting.ability.name}: ${((casting.lands - game.tick) / TICK_RATE).toFixed(1)} s`
				:	doing(hero.order, unit.target?.name ?? null),
			statuses: STATUS_IDS.filter((id) => world.has(unit, id)).map((id) => ({
				id,
				name: STATUSES[id].name,
				left: Math.ceil((unit.statuses[id] - game.tick) / TICK_RATE)
			})),
			abilities: KEYS.flatMap((key, slot) => {
				const ability = game.ability(slot)
				if (!ability) return []
				return [
					{
						key,
						slot,
						ability,
						usable: game.usable(ability),
						aiming: targeting?.kind === "ability" && targeting.ability === ability
					}
				]
			}),
			prompt:
				targeting?.kind === "attackMove" ? "Attack-move: left-click where"
				: targeting?.kind === "ability" ? prompt(targeting.ability)
				: null
		}
	})
</script>

{#if info}
	<section class="win" aria-label="Your hero">
		<header>
			<strong>{info.name}</strong>
			<span class="gold" title="Gold">{info.gold} g</span>
			<span class="num" title="Last hits / denies">{info.lastHits} / {info.denies}</span>
		</header>
		{#if info.alive}
			<div class="bar">
				<span>HP</span>
				<meter max={info.maxHp} min="0" value={info.hp}></meter>
				<span class="num">{info.hp}/{info.maxHp}</span>
			</div>
			<div class="bar">
				<span>MP</span>
				<meter class="mp" max={info.maxMp} min="0" value={info.mp}></meter>
				<span class="num">{info.mp}/{info.maxMp}</span>
			</div>
			<div class="bar">
				<span>CT</span>
				<meter class="ct" max="100" min="0" value={info.gauge}></meter>
				<span class="num" class:ready={info.gauge === 100}>
					{info.gauge === 100 ? "Ready" : info.gauge}
				</span>
			</div>
			{#if info.statuses.length > 0}
				<ul class="statuses">
					{#each info.statuses as status (status.id)}
						<li class={status.id}>{status.name} {status.left} s</li>
					{/each}
				</ul>
			{/if}
			<div class="abilities">
				{#each info.abilities as { key, slot, ability, usable, aiming } (key)}
					<button
						aria-pressed={aiming}
						disabled={!usable}
						onclick={(event) => {
							game.useAbility(slot)
							event.currentTarget.blur()
						}}
						title={ability.enabled ? undefined : "Not built yet"}
						type="button"
					>
						<kbd>{key}</kbd>
						<span>{ability.name}</span>
						<span class="cost">
							{ability.mp} MP{ability.charge > 0 ? ` · ${String(ability.charge)} s` : ""}
						</span>
					</button>
				{/each}
			</div>
			<p>{info.prompt ?? info.doing}</p>
		{:else}
			<p class="dead">Fallen. Back at the Clan Hall in {info.respawn} s</p>
		{/if}
	</section>
{/if}

<style>
	section {
		left: 50%;
		bottom: 12px;
		transform: translateX(-50%);
		width: 400px;
	}
	header {
		display: flex;
		align-items: baseline;
		gap: 12px;
		font-family: var(--display);
		font-size: 16px;
		margin-bottom: 6px;
	}
	header strong {
		flex: 1;
	}
	.gold {
		color: #ffd24a;
		font-family: var(--mono);
		font-size: 13px;
	}
	.bar {
		display: grid;
		grid-template-columns: 2em 1fr 5.5em;
		align-items: center;
		gap: 6px;
	}
	meter {
		width: 100%;
		height: 10px;
	}
	.mp::-webkit-meter-optimum-value {
		background: #6fa8ff;
	}
	.mp::-moz-meter-bar {
		background: #6fa8ff;
	}
	.ct::-webkit-meter-optimum-value {
		background: var(--cursor);
	}
	.ct::-moz-meter-bar {
		background: var(--cursor);
	}
	.num {
		font-family: var(--mono);
		font-size: 12px;
		text-align: right;
	}
	.ready {
		color: var(--cursor);
	}
	.statuses {
		display: flex;
		gap: 6px;
		margin: 6px 0 0;
		padding: 0;
		list-style: none;
		font-size: 12px;
	}
	.statuses li {
		padding: 0 6px;
		border-radius: 3px;
		background: rgb(0 0 0 / 0.3);
	}
	.slow {
		color: #c79bff;
	}
	.chill {
		color: #9fd8ff;
	}
	.abilities {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
		margin: 8px 0 6px;
	}
	button {
		display: grid;
		grid-template-columns: auto 1fr;
		grid-template-rows: auto auto;
		column-gap: 6px;
		align-items: baseline;
		text-align: left;
		font: inherit;
		font-size: 12px;
		color: var(--fg);
		background: rgb(0 0 0 / 0.25);
		border: 1px solid rgb(205 189 140 / 0.35);
		border-radius: 4px;
		padding: 4px 6px;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	button[aria-pressed="true"] {
		border-color: var(--cursor);
		box-shadow: 0 0 0 1px var(--cursor);
	}
	kbd {
		grid-row: span 2;
		font-family: var(--mono);
		color: var(--cursor);
	}
	.cost {
		color: var(--muted);
		font-family: var(--mono);
		font-size: 11px;
	}
	p {
		margin: 0;
		color: var(--cursor);
	}
	.dead {
		color: var(--dire);
		font-family: var(--display);
		font-size: 15px;
	}
</style>
