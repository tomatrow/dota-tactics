import { linear, quadOut } from "svelte/easing"
import { Tween } from "svelte/motion"
import { expect, test } from "vitest"
import { reversed, tween } from "./Tweener.ts"

test("reversed plays an easing curve backwards", () => {
	const back = reversed(quadOut)
	for (const t of [0, 0.25, 0.5, 1]) expect(back(t)).toBeCloseTo(1 - quadOut(1 - t))
})

test("a ping-pong loop goes there and back, then completes at the start", async () => {
	const target = new Tween(0)
	const samples: number[] = []
	const sample = setInterval(() => samples.push(target.current), 10)
	const started = performance.now()

	await tween(target, 0, 10, 0.1, linear, { loopCount: 1, loopType: "PingPong" })
	clearInterval(sample)

	expect(performance.now() - started).toBeGreaterThanOrEqual(190)
	expect(Math.max(...samples)).toBeGreaterThan(8)
	expect(target.current).toBe(0)
})

test("starts from the given start value", async () => {
	const target = new Tween(5)
	await tween(target, 0, 1, 0, linear)
	expect(target.current).toBe(1)
})
