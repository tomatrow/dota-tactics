import { expect, test } from "vitest"
import { render } from "vitest-browser-svelte"
import { StatPanelController } from "#lib/controller/StatPanelController.svelte.ts"
import StatPanelControllerView from "./StatPanelControllerView.svelte"

test("renders a stat panel's labels while it's shown", async () => {
	const controller = new StatPanelController()
	const screen = await render(StatPanelControllerView, { props: { controller } })
	expect(screen.container.querySelector("p")).toBeNull()

	controller.primaryPanel.shown = true
	await expect.element(screen.getByText("Arthur")).toBeInTheDocument()
	expect(screen.getByText("HP 90 / 90").elements()).toHaveLength(1)
	expect(screen.getByText("LV. 5").elements()).toHaveLength(1)
})
