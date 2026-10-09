import { AudioClip } from "#lib/common/audio.ts"

/**
 * A rate where a render quantum (128 frames) and the clips below last a power-of-two fraction of a
 * second: schedules land exactly on frames, so rendered samples equal the clips' samples.
 */
export const sampleRate = 8192

/** An audio context that renders `frames` frames as fast as it can (`startRendering()`). */
export function offline(frames: number): OfflineAudioContext {
	return new OfflineAudioContext({ numberOfChannels: 1, length: frames, sampleRate })
}

/** A mono clip of `samples` (exactly representable values, e.g. multiples of 1/64). */
export function clip(context: BaseAudioContext, name: string, samples: number[]): AudioClip {
	const buffer = context.createBuffer(1, samples.length, sampleRate)
	buffer.copyToChannel(Float32Array.from(samples), 0)
	return new AudioClip(name, buffer)
}

/** `count` samples counting up from `from` in steps of 1/64 (each one tells where it came from). */
export function ramp(from: number, count: number): number[] {
	return Array.from({ length: count }, (_, i) => (from + i) / 64)
}

/** `count` silent samples. */
export function silence(count: number): number[] {
	return Array.from({ length: count }, () => 0)
}

/** The rendered samples. */
export async function rendered(context: OfflineAudioContext): Promise<number[]> {
	return Array.from((await context.startRendering()).getChannelData(0))
}
