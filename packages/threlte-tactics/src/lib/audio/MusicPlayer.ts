import type { AudioClip } from "#lib/common/audio.ts"
import { AudioSequence } from "./AudioSequence.ts"

/** Port of `Audio/MusicPlayer.cs`: plays an intro, then a loop for as long as the scene lasts. */
export class MusicPlayer {
	readonly introClip: AudioClip
	readonly loopClip: AudioClip
	sequence: AudioSequence | null = null

	constructor(introClip: AudioClip, loopClip: AudioClip) {
		this.introClip = introClip
		this.loopClip = loopClip
	}

	start(context: BaseAudioContext, output?: AudioNode): void {
		this.sequence = new AudioSequence(context, output)
		this.sequence.play(this.introClip, this.loopClip)
		this.sequence.getData(this.loopClip).source.loop = true
	}

	/** Stops the music, as the battle ends. */
	destroy(): void {
		this.sequence?.stop()
	}
}
