// Renders the sequences on an offline audio context and compares the samples (browser-only API).
import { describe, expect, test } from "vitest"
import { clip, offline, ramp, rendered, sampleRate, silence } from "#lib/testing/audio.ts"
import { AudioSequence } from "./AudioSequence.ts"
import { MusicPlayer } from "./MusicPlayer.ts"

describe("MusicPlayer", () => {
	test("plays the intro, then the loop over and over, with no gaps", async () => {
		const context = offline(512)
		const intro = clip(context, "Intro", ramp(1, 128))
		const loop = clip(context, "Loop", ramp(-64, 64))

		new MusicPlayer(intro, loop).start(context)

		const loops = Array.from({ length: 6 }, () => ramp(-64, 64)).flat()
		expect(await rendered(context)).toEqual([...ramp(1, 128), ...loops])
	})

	test("stops when destroyed", async () => {
		const context = offline(512)
		const player = new MusicPlayer(
			clip(context, "Intro", ramp(1, 128)),
			clip(context, "Loop", ramp(-64, 64))
		)
		player.start(context)
		void context.suspend(256 / sampleRate).then(async () => {
			player.destroy()
			await context.resume()
		})

		const samples = await rendered(context)

		expect(samples.slice(0, 192)).toEqual([...ramp(1, 128), ...ramp(-64, 64)])
		expect(samples.slice(256)).toEqual(silence(256))
	})
})

describe("AudioSequence", () => {
	test("plays clips after the ones still to play, even from the clock's start", async () => {
		const context = offline(256)
		const sequence = new AudioSequence(context)

		sequence.play(clip(context, "A", ramp(1, 64)))
		sequence.play(clip(context, "B", ramp(-64, 64)))

		expect(await rendered(context)).toEqual([...ramp(1, 64), ...ramp(-64, 64), ...silence(128)])
	})

	test("plays clips at once when the earlier ones have ended", async () => {
		const context = offline(256)
		const sequence = new AudioSequence(context)
		sequence.play(clip(context, "A", ramp(1, 64)))
		void context.suspend(128 / sampleRate).then(async () => {
			sequence.play(clip(context, "B", ramp(-64, 64)))
			await context.resume()
		})

		expect(await rendered(context)).toEqual([
			...ramp(1, 64),
			...silence(64),
			...ramp(-64, 64),
			...silence(64)
		])
	})

	test("a clip played again moves to the end (one source per clip)", async () => {
		const context = offline(256)
		const sequence = new AudioSequence(context)
		const a = clip(context, "A", ramp(1, 64))

		sequence.play(a, clip(context, "B", ramp(-64, 64)))
		sequence.play(a)

		expect(sequence.getData(a).startTime).toBe(128 / sampleRate)
		expect(await rendered(context)).toEqual([
			...silence(64),
			...ramp(-64, 64),
			...ramp(1, 64),
			...silence(64)
		])
	})

	test("stopping stops every clip and forgets when they were to play", async () => {
		const context = offline(256)
		const sequence = new AudioSequence(context)
		const b = clip(context, "B", ramp(-64, 64))
		sequence.play(clip(context, "A", ramp(1, 64)), b)

		sequence.stop()
		expect(sequence.getData(b).isScheduled).toBe(false)
		sequence.play(b)

		expect(await rendered(context)).toEqual([...ramp(-64, 64), ...silence(192)])
	})
})
