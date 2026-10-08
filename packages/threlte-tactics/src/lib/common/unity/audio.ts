/**
 * The parts of Unity's audio API that the game uses (`AudioClip`, `AudioSource`,
 * `AudioSettings.dspTime`), on Web Audio. Unity's audio engine is an `AudioContext`: one for the
 * whole game (browsers start it only once the player has interacted with the page).
 */

/** Unity's `AudioClip`: a decoded sound. */
export class AudioClip {
	readonly name: string
	readonly buffer: AudioBuffer

	constructor(name: string, buffer: AudioBuffer) {
		this.name = name
		this.buffer = buffer
	}

	/** Seconds. */
	get length(): number {
		return this.buffer.duration
	}

	/** Fetches and decodes the sound at `url` (Unity loads a scene's clips with it). */
	static async load(context: BaseAudioContext, name: string, url: string): Promise<AudioClip> {
		const response = await fetch(url)
		if (!response.ok) throw new Error(`Couldn't load ${name} (${url}): ${response.status}`)
		return new AudioClip(name, await context.decodeAudioData(await response.arrayBuffer()))
	}
}

/**
 * Unity's `AudioSource`: plays its clip. A Web Audio source node plays only once, so each play is
 * a new one.
 */
export class AudioSource {
	readonly context: BaseAudioContext
	/** Where it plays to (Unity's mixer group). */
	readonly output: AudioNode
	clip: AudioClip | null = null
	#loop = false
	#node: AudioBufferSourceNode | null = null

	constructor(context: BaseAudioContext, output: AudioNode = context.destination) {
		this.context = context
		this.output = output
	}

	/** Whether the clip plays again from the start when it ends. Takes effect at once. */
	get loop(): boolean {
		return this.#loop
	}
	set loop(value: boolean) {
		this.#loop = value
		if (this.#node) this.#node.loop = value
	}

	/** Plays the clip from the start at `time` (on `dspTime`'s clock), instead of any play so far. */
	playScheduled(time: number): void {
		this.stop()
		if (!this.clip) return
		const node = this.context.createBufferSource()
		node.buffer = this.clip.buffer
		node.loop = this.#loop
		node.connect(this.output)
		node.start(time)
		this.#node = node
	}

	/** Moves a scheduled play to `time`. A started node can't be moved, so it schedules a new one. */
	setScheduledStartTime(time: number): void {
		this.playScheduled(time)
	}

	stop(): void {
		const node = this.#node
		if (!node) return
		this.#node = null
		node.stop()
		node.disconnect()
	}
}

/** Unity's `AudioSettings.dspTime`: the audio clock, in seconds. */
export function dspTime(context: BaseAudioContext): number {
	return context.currentTime
}
