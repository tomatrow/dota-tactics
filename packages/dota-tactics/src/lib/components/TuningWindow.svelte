<!--
	Tuning (DESIGN.md §11, milestone 6), top right, opened with ` or its title: how the heroes spend
	their time (telemetry for §11's two questions) and every number the game plays by, changeable
	while it runs. A change applies to this game from the next tick and goes into the links to new
	games (`?tune=`); the content keeps the defaults. "Copy" puts a report on the clipboard: the
	game, what's tuned, and the telemetry.
-->
<script lang="ts">
	import { numbers } from "#lib/content/rules.ts"
	import { getGameState, teamName } from "#lib/game/GameState.svelte.ts"
	import { sections, signed } from "#lib/game/tuning.ts"
	import { TICK_RATE } from "#lib/sim/constants.ts"
	import { WAIT_BUCKETS, type Summary } from "#lib/sim/telemetry.ts"
	import type { Unit } from "#lib/sim/unit.ts"

	const game = getGameState()
	const list = sections(game.world)
	const defaults = numbers(game.defaults)

	let tab = $state<"time" | "numbers">("time")
	/** Bumped when the telemetry restarts, which nothing reactive sees. */
	let restarts = $state(0)
	let copied = $state("")

	const percent = (share: number) => `${String(Math.round(share * 100))}%`
	const seconds = (s: number) => `${s.toFixed(1)} s`
	const clock = (tick: number) => {
		const s = Math.floor(tick / TICK_RATE)
		return `${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, "0")}`
	}

	/** The telemetry's rows: a name, what it means, and its value. */
	const ROWS: readonly (readonly [string, string, (s: Summary) => string])[] = [
		[
			"Actions/min",
			"actions a minute alive, of the most its gauge allows",
			(s) => `${s.actionsPerMinute.toFixed(1)} / ${s.mostPerMinute.toFixed(0)}`
		],
		["Walking", "stepping between tiles: the gauge pauses", (s) => percent(s.walking)],
		["Charging", "standing, the gauge filling", (s) => percent(s.charging)],
		["Full, standing", "could act, and hasn't", (s) => percent(s.ready)],
		["Casting", "charging a spell", (s) => percent(s.casting)],
		["Gauge full", "standing or walking", (s) => percent(s.full)],
		[
			"Acted as it filled",
			"actions within ¼ s of the gauge filling: if it's nearly all, the cadence is too slow",
			(s) => percent(s.prompt)
		],
		["Median wait", "from a full gauge to acting", (s) => seconds(s.medianWait)]
	]

	/** Names of the waits' buckets. */
	const BUCKETS = [
		...WAIT_BUCKETS.map((bound) => `< ${String(bound)} s`),
		`≥ ${String(WAIT_BUCKETS.at(-1))} s`
	]

	const who = (unit: Unit) => (unit === game.hero ? "You" : "AI")

	const heroes = $derived.by(() => {
		void game.tick
		void restarts
		return [game.hero, game.opponent].map((unit) => {
			const summary = game.telemetry.summary(unit)
			const most = Math.max(1, ...summary.buckets)
			return { unit, summary, bars: summary.buckets.map((n) => ({ n, height: n / most })) }
		})
	})

	const counting = $derived.by(() => {
		void restarts
		return `Counting since ${clock(game.telemetry.since)}`
	})

	/** The sections with each number's value now and its default. */
	const shown = $derived.by(() => {
		void game.retuned
		const now = numbers(game.world.rules)
		return list.map((section) => ({
			title: section.title,
			groups: section.groups.map((group) => ({
				title: group.title,
				knobs: group.knobs.map((knob) => ({
					...knob,
					value: now.get(knob.path) ?? 0,
					was: defaults.get(knob.path) ?? 0
				}))
			}))
		}))
	})

	const changed = $derived(game.changes())

	function set(path: string, input: HTMLInputElement) {
		if (game.tune(path, input.valueAsNumber)) return
		input.value = String(numbers(game.world.rules).get(path) ?? "")
	}

	function resetAll() {
		for (const [path] of changed) {
			const value = defaults.get(path)
			if (value !== undefined) game.tune(path, value)
		}
	}

	function restart() {
		game.telemetry.reset()
		restarts++
	}

	/** The game, what's tuned and the telemetry, as text for a playtest note. */
	function report(): string {
		const describe = (unit: Unit) =>
			`the ${teamName(unit.team)} ${unit.name}${unit === game.opponent ? " (AI)" : ""}`
		const tuned = changed.map(
			([path, value]) => `${path} ${String(defaults.get(path) ?? "?")} → ${String(value)}`
		)
		const lines = [
			`dota-tactics, seed ${String(game.seed)}, ${clock(game.tick)}: ${describe(game.hero)} against ${describe(game.opponent)}.`,
			`Tuned: ${tuned.length > 0 ? tuned.join(", ") : "nothing"}.`,
			`${counting}.`
		]
		for (const { unit, summary: s } of heroes) {
			lines.push(
				`${who(unit)}: ${s.actionsPerMinute.toFixed(1)} of ${s.mostPerMinute.toFixed(0)} actions/min; ` +
					`walking ${percent(s.walking)}, charging ${percent(s.charging)}, full standing ${percent(s.ready)}, ` +
					`casting ${percent(s.casting)}; acted as it filled ${percent(s.prompt)}, median wait ` +
					`${seconds(s.medianWait)}; waits ${BUCKETS.map((b, i) => `${b}: ${String(s.buckets[i])}`).join(", ")} ` +
					`(${s.minutes.toFixed(1)} min alive).`
			)
		}
		lines.push(`New game with these numbers: ${location.origin}${location.pathname}${game.href()}`)
		return lines.join("\n")
	}

	async function copy() {
		try {
			await navigator.clipboard.writeText(report())
			copied = "Copied"
		} catch {
			copied = "Couldn't copy"
		}
		setTimeout(() => (copied = ""), 2000)
	}
</script>

<section class="win" aria-label="Tuning">
	<header>
		<button
			class="title"
			aria-expanded={game.tuning}
			onclick={(event) => {
				game.tuning = !game.tuning
				event.currentTarget.blur()
			}}
			title="Tuning (`)"
			type="button"
		>
			Tuning
		</button>
		{#if game.tuning}
			<div class="tabs" role="tablist">
				<button
					aria-selected={tab === "time"}
					onclick={() => (tab = "time")}
					role="tab"
					type="button"
				>
					Time
				</button>
				<button
					aria-selected={tab === "numbers"}
					onclick={() => (tab = "numbers")}
					role="tab"
					type="button"
				>
					Numbers{changed.length > 0 ? ` (${String(changed.length)})` : ""}
				</button>
			</div>
			<button
				onclick={copy}
				title="Copy a report: the game, what's tuned, the telemetry"
				type="button"
			>
				{copied || "Copy"}
			</button>
		{/if}
	</header>

	{#if game.tuning && tab === "time"}
		<div class="body" role="tabpanel">
			<table>
				<thead>
					<tr>
						<th></th>
						{#each heroes as { unit } (unit.id)}
							<th class={unit.team} scope="col">
								{who(unit)}<br /><small>{unit.hero?.job.name}</small>
							</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each ROWS as [label, hint, value] (label)}
						<tr title={hint}>
							<th scope="row">{label}</th>
							{#each heroes as { unit, summary } (unit.id)}
								<td>{value(summary)}</td>
							{/each}
						</tr>
					{/each}
					<tr title="actions by how long the gauge had been full: {BUCKETS.join(', ')}">
						<th scope="row">Waits</th>
						{#each heroes as { unit, bars } (unit.id)}
							<td>
								<span class="bars">
									{#each bars as bar, i (i)}
										<span
											style:height="{Math.round(bar.height * 100)}%"
											title="{BUCKETS[i]}: {bar.n}"
										></span>
									{/each}
								</span>
							</td>
						{/each}
					</tr>
				</tbody>
			</table>
			<footer>
				<span>{counting}</span>
				<button onclick={restart} title="Start counting afresh, after tuning" type="button">
					Restart
				</button>
			</footer>
		</div>
	{:else if game.tuning}
		<div class="body" role="tabpanel">
			<footer>
				<a data-sveltekit-reload href={game.href()}>New game with these</a>
				<button disabled={changed.length === 0} onclick={resetAll} type="button">Reset all</button>
			</footer>
			{#each shown as section (section.title)}
				<details open={section.title === "Rules"}>
					<summary>{section.title}</summary>
					{#each section.groups as group (group.title)}
						{#if group.title}
							<h3>{group.title}</h3>
						{/if}
						{#each group.knobs as knob (knob.path)}
							<div class="knob" class:changed={knob.value !== knob.was}>
								<label title="{knob.hint} ({knob.path})">
									<span>{knob.label}</span>
									<input
										min={signed(knob.path) ? undefined : 0}
										onchange={(event) => set(knob.path, event.currentTarget)}
										step="any"
										type="number"
										value={knob.value}
									/>
								</label>
								{#if knob.value !== knob.was}
									<button
										onclick={() => game.tune(knob.path, knob.was)}
										title="Back to {knob.was}"
										type="button"
									>
										↺ {knob.was}
									</button>
								{/if}
							</div>
						{/each}
					{/each}
				</details>
			{/each}
		</div>
	{/if}
</section>

<style>
	section {
		top: 12px;
		right: 12px;
		width: 300px;
		padding: 6px 10px;
		font-size: 12px;
	}
	header {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	button,
	a {
		font: inherit;
		color: var(--fg);
		background: rgb(0 0 0 / 0.25);
		border: 1px solid transparent;
		border-radius: 4px;
		padding: 1px 6px;
		cursor: pointer;
		text-decoration: none;
	}
	button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.title {
		font-family: var(--display);
		font-size: 15px;
		letter-spacing: 0.04em;
		background: none;
		padding: 0;
		margin-right: auto;
	}
	.tabs {
		display: flex;
		gap: 2px;
	}
	[aria-selected="true"] {
		border-color: var(--edge);
		color: var(--cursor);
	}
	.body {
		max-height: max(160px, calc(100vh - 330px));
		overflow-y: auto;
		margin-top: 6px;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th,
	td {
		padding: 1px 0;
		text-align: right;
		font-weight: normal;
	}
	th[scope="row"] {
		text-align: left;
		color: var(--muted);
	}
	td {
		font-family: var(--mono);
	}
	thead th {
		line-height: 1.2;
	}
	small {
		color: var(--muted);
	}
	.radiant {
		color: var(--radiant);
	}
	.dire {
		color: var(--dire);
	}
	.bars {
		display: inline-flex;
		align-items: flex-end;
		gap: 2px;
		height: 22px;
	}
	.bars span {
		width: 7px;
		min-height: 1px;
		background: var(--cursor);
	}
	footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		margin: 6px 0;
		color: var(--muted);
	}
	footer a {
		color: var(--cursor);
		border-color: var(--edge);
	}
	details {
		border-top: 1px solid rgb(205 189 140 / 0.3);
		padding: 3px 0;
	}
	summary {
		cursor: pointer;
		font-family: var(--display);
		font-size: 13px;
	}
	h3 {
		margin: 6px 0 2px;
		font-size: 12px;
		font-weight: 600;
		color: var(--cursor);
	}
	.knob {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	label {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 6px;
		color: var(--muted);
	}
	.changed label {
		color: var(--cursor);
	}
	input {
		width: 5.5em;
		font: inherit;
		font-family: var(--mono);
		color: var(--fg);
		background: rgb(0 0 0 / 0.3);
		border: 1px solid rgb(205 189 140 / 0.4);
		border-radius: 3px;
		padding: 0 4px;
		text-align: right;
	}
	.knob button {
		font-family: var(--mono);
		font-size: 11px;
		color: var(--muted);
		padding: 0 4px;
	}
</style>
