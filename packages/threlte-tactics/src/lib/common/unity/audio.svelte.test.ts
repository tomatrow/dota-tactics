// Decodes and renders audio (browser-only APIs).
import { describe, expect, test } from "vitest"
import intro from "#lib/assets/audio/music/Strategy RPG Battle_Intro.m4a"
import loop from "#lib/assets/audio/music/Strategy RPG Battle_Loop.m4a"
import { clip, offline, ramp, rendered, sampleRate, silence } from "#lib/testing/audio.ts"
import { AudioClip, AudioSource, dspTime } from "./audio.ts"

describe("AudioClip", () => {
	test("loads the battle music, as long as Unity's WAVs (1,814,400 and 3,931,200 samples at 44.1 kHz)", async () => {
		const context = new OfflineAudioContext({ length: 1, sampleRate: 44100 })

		const clips = await Promise.all([
			AudioClip.load(context, "Strategy RPG Battle_Intro", intro),
			AudioClip.load(context, "Strategy RPG Battle_Loop", loop)
		])

		expect(clips.map((c) => [c.name, c.buffer.numberOfChannels])).toEqual([
			["Strategy RPG Battle_Intro", 2],
			["Strategy RPG Battle_Loop", 2]
		])
		expect(clips[0]!.length).toBeCloseTo(1_814_400 / 44100, 2)
		expect(clips[1]!.length).toBeCloseTo(3_931_200 / 44100, 2)
	})

	test("fails to load what isn't there", async () => {
		const context = offline(1)

		await expect(AudioClip.load(context, "Nothing", "/nothing.m4a")).rejects.toThrow()
	})
})

describe("AudioSource", () => {
	test("plays its clip once, from when it's scheduled", async () => {
		const context = offline(256)
		const source = new AudioSource(context)
		source.clip = clip(context, "A", ramp(1, 64))

		source.playScheduled(128 / sampleRate)

		expect(await rendered(context)).toEqual([...silence(128), ...ramp(1, 64), ...silence(64)])
	})

	test("looping takes effect at once, even once it's scheduled", async () => {
		const context = offline(192)
		const source = new AudioSource(context)
		source.clip = clip(context, "A", ramp(1, 64))
		source.playScheduled(0)

		source.loop = true

		expect(source.loop).toBe(true)
		expect(await rendered(context)).toEqual([...ramp(1, 64), ...ramp(1, 64), ...ramp(1, 64)])
	})

	test("a new schedule replaces the last one; stopping silences it", async () => {
		const context = offline(256)
		const moved = new AudioSource(context)
		moved.clip = clip(context, "A", ramp(1, 64))
		const stopped = new AudioSource(context)
		stopped.clip = clip(context, "B", ramp(-64, 64))
		moved.playScheduled(0)
		stopped.playScheduled(128 / sampleRate)

		moved.setScheduledStartTime(64 / sampleRate)
		stopped.stop()

		expect(await rendered(context)).toEqual([...silence(64), ...ramp(1, 64), ...silence(128)])
	})

	test("plays nothing without a clip", async () => {
		const context = offline(128)

		new AudioSource(context).playScheduled(0)

		expect(await rendered(context)).toEqual(silence(128))
	})

	test("dspTime is the context's clock", () => {
		expect(dspTime(offline(1))).toBe(0)
	})
})
