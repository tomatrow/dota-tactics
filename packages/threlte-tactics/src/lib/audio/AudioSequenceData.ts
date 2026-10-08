import type { AudioSource } from "#lib/common/unity/audio.ts"

/** Port of `Audio/AudioSequenceData.cs`: an audio source and when it's scheduled to play. */
export class AudioSequenceData {
	readonly source: AudioSource
	#startTime = -1

	constructor(source: AudioSource) {
		this.source = source
	}

	/** On `dspTime`'s clock; negative when not scheduled. */
	get startTime(): number {
		return this.#startTime
	}

	get isScheduled(): boolean {
		// Unity's `> 0`: its audio clock is never 0 by the time a scene starts, but a browser's is
		// until the player first interacts with the page.
		return this.#startTime >= 0
	}

	get endTime(): number {
		return this.#startTime + (this.source.clip?.length ?? 0)
	}

	schedule(time: number): void {
		if (this.isScheduled) this.source.setScheduledStartTime(time)
		else this.source.playScheduled(time)
		this.#startTime = time
	}

	stop(): void {
		this.#startTime = -1
		this.source.stop()
	}
}
