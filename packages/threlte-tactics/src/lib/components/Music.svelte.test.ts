import { afterEach, expect, test, vi } from "vitest"
import { render } from "vitest-browser-svelte"
import Music from "./Music.svelte"

const intro = 1_814_400 / 44100

afterEach(() => {
	vi.restoreAllMocks()
})

function spyOnSources() {
	return {
		start: vi.spyOn(AudioBufferSourceNode.prototype, "start"),
		stop: vi.spyOn(AudioBufferSourceNode.prototype, "stop")
	}
}

test("loads the battle music, plays the intro then the loop until unmounted", async () => {
	const context = new OfflineAudioContext({ length: 1, sampleRate: 8000 })
	const { start, stop } = spyOnSources()

	const screen = await render(Music, { props: { context } })

	await expect.poll(() => start.mock.calls.length, { timeout: 10_000 }).toBe(2)
	expect(start.mock.calls[0]).toEqual([0])
	expect(start.mock.calls[1]![0]).toBeCloseTo(intro, 2)
	expect(stop).not.toHaveBeenCalled()

	await screen.unmount()

	expect(stop).toHaveBeenCalledTimes(2)
})

test("plays nothing if unmounted before the music has loaded", async () => {
	const context = new OfflineAudioContext({ length: 1, sampleRate: 8000 })
	const decode = vi.spyOn(context, "decodeAudioData")
	const { start } = spyOnSources()

	const screen = await render(Music, { props: { context } })
	await screen.unmount()

	await expect.poll(() => decode.mock.results.length, { timeout: 10_000 }).toBe(2)
	await Promise.allSettled(
		decode.mock.results.map((result) => result.value as Promise<AudioBuffer>)
	)
	await new Promise((resolve) => setTimeout(resolve, 0))
	expect(start).not.toHaveBeenCalled()
})
