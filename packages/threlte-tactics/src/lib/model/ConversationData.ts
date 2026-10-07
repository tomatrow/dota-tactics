import type { SpeakerData } from "./SpeakerData.ts"

/** Port of `Model/ConversationData.cs`: speakers taking turns (`Resources/Conversations`). */
export interface ConversationData {
	list: SpeakerData[]
}
