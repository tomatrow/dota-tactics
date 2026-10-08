import { type AudioClip, AudioSource, dspTime } from "#lib/common/unity/audio.ts"
import { AudioSequenceData } from "./AudioSequenceData.ts"

/**
 * Port of `Audio/AudioSequence.cs`, the parts the game uses (not `Pause`/`UnPause`, nor the play
 * mode only they need): plays clips one after another, with no gap between them.
 */
export class AudioSequence {
	readonly context: BaseAudioContext
	readonly output: AudioNode
	readonly #playMap = new Map<AudioClip, AudioSequenceData>()

	constructor(context: BaseAudioContext, output: AudioNode = context.destination) {
		this.context = context
		this.output = output
	}

	/** Schedules `clips` to play one after another, after the clips already playing (or now). */
	play(...clips: AudioClip[]): void {
		let startTime = this.#nextStartTime()
		for (const clip of clips) {
			this.getData(clip).schedule(startTime)
			startTime += clip.length
		}
	}

	stop(): void {
		for (const data of this.#playMap.values()) data.stop()
	}

	/** The source that plays `clip` and when it's scheduled. */
	getData(clip: AudioClip): AudioSequenceData {
		let data = this.#playMap.get(clip)
		if (!data) {
			const source = new AudioSource(this.context, this.output)
			source.clip = clip
			data = new AudioSequenceData(source)
			this.#playMap.set(clip, data)
		}
		return data
	}

	/** The scheduled clip that ends last. */
	#last(): AudioSequenceData | null {
		let last: AudioSequenceData | null = null
		for (const data of this.#playMap.values())
			if (data.isScheduled && (last === null || data.endTime > last.endTime)) last = data
		return last
	}

	#nextStartTime(): number {
		const last = this.#last()
		const now = dspTime(this.context)
		return last !== null && last.endTime > now ? last.endTime : now
	}
}
