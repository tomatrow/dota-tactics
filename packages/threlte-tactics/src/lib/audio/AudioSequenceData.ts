import type { AudioSource } from "#lib/common/audio.ts"

/** Port of `Audio/AudioSequenceData.cs`: an audio source and when it's scheduled to play. */
export class AudioSequenceData {
	readonly source: AudioSource
	#startTime = -1

	constructor(source: AudioSource) {
		this.source = source
	}

	/** On the audio context's clock; negative when not scheduled. */
	get startTime(): number {
		return this.#startTime
	}

	get isScheduled(): boolean {
		// A browser's audio clock is still 0 until the player first interacts with the page.
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
