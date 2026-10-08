import { expect, test } from "vitest"
import { render } from "vitest-browser-svelte"
import { HitSuccessIndicator } from "#lib/view-model-component/HitSuccessIndicator.svelte.ts"
import HitSuccessIndicatorView from "./HitSuccessIndicatorView.svelte"

test("renders the arrow, filled to the chance, and the label, once shown", async () => {
	const indicator = new HitSuccessIndicator()
	const screen = await render(HitSuccessIndicatorView, { props: { indicator } })
	expect(screen.container.querySelector("img")).toBeNull()

	indicator.setStats(88, -12)
	indicator.show()
	const label = screen.getByText("88% 12pt(s)")
	await expect.element(label).toBeInTheDocument()
	await expect.element(label).toHaveStyle({ color: "rgb(255, 0, 0)" })
	const [backer, fill] = screen.container.querySelectorAll("img")
	expect(backer!.style.clipPath).toBe("")
	expect(fill!.style.clipPath).toBe("inset(0px 12% 0px 0px)")
})
