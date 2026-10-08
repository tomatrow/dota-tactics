import { expect, test, type Page } from "@playwright/test"

/** The text on each of the game's UI canvases, or `null` while it isn't shown. */
function ui(page: Page) {
	return page.evaluate(() => {
		const text = (name: string) => {
			const region = document.querySelector<HTMLElement>(`[role=region][aria-label="${name}"]`)
			return region ? region.innerText.replace(/\s+/g, " ").trim() : null
		}
		return {
			conversation: text("Conversation Controller"),
			menu: text("Ability Menu Controller"),
			message: text("Battle Message Controller")
		}
	})
}

/** Presses the keys one after another, a frame apart (as a player would: input is read per frame). */
async function press(page: Page, ...keys: string[]) {
	for (const key of keys) {
		await page.keyboard.press(key)
		await page.clock.fastForward(100)
	}
}

const intro = "Be scared... Cause I am awesome!!!"
const outros = { lose: "I told you to be afraid.", win: "I lost?  How could this happen?" }

test("a whole battle: intro, the heroes' turns and the computer's, an outro, then the next battle", async ({
	page
}) => {
	test.setTimeout(10 * 60_000)
	// Game time runs on a fake clock, jumped half a second at a time (a frame per jump).
	await page.clock.install()
	await page.goto("/?seed=4")

	let heroTurns = 0
	let menuWasShown = false
	const abilities = new Set<string>()
	let outro: string | null = null
	const gameMinutes = () => (step * 0.5) / 60
	let step = 0
	for (; ; ++step) {
		expect(gameMinutes(), "the battle should end within half an hour").toBeLessThan(30)
		await page.clock.fastForward(500)
		const { conversation, menu, message } = await ui(page)
		if (message) abilities.add(message)

		if (conversation !== null) {
			if (outro === null) {
				if (conversation.includes(outros.lose)) outro = outros.lose
				if (conversation.includes(outros.win)) outro = outros.win
				if (outro !== null) await page.screenshot({ path: test.info().outputPath("outro.png") })
			} else if (conversation.includes(intro)) {
				// The battle started over.
				break
			}
			await press(page, "Enter")
			// Time for the next message to come in.
			await page.clock.fastForward(1000)
		} else if (menu?.startsWith("Commands")) {
			// A hero's turn: Wait, keeping its facing. (While the menu hides, the keys do nothing.)
			if (!menuWasShown) ++heroTurns
			await press(page, "ArrowDown", "ArrowDown", "Enter", "Enter")
		}
		menuWasShown = menu !== null
	}

	expect(outro).toBe(outros.lose)
	expect(heroTurns).toBeGreaterThan(3)
	// The enemies' abilities, named as they use them.
	expect([...abilities]).toEqual(expect.arrayContaining(["Attack", "Water"]))
	console.log(
		`Game time ${gameMinutes().toFixed(1)} min; ${heroTurns} hero turns; ` +
			`enemy abilities: ${[...abilities].join(", ")}`
	)
})
