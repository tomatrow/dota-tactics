import { expect, test } from "vitest"
import { render } from "vitest-browser-svelte"
import { StatPanelController } from "#lib/controller/StatPanelController.svelte.ts"
import StatPanelControllerView from "./StatPanelControllerView.svelte"

test("renders both stat panels' labels, off screen until shown", async () => {
	const controller = new StatPanelController()
	const screen = await render(StatPanelControllerView, { props: { controller } })
	await expect.element(screen.getByText("Arthur").first()).toBeInTheDocument()
	expect(screen.getByText("HP 90 / 90").elements()).toHaveLength(2)
	expect(screen.getByText("LV. 5").elements()).toHaveLength(2)
})
