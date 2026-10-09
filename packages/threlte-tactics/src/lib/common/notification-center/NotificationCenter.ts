/**
 * Notification name → the arguments its handlers receive: `[sender, args]`. Modules that post
 * notifications add theirs by augmenting this interface
 * (`declare module "#lib/common/notification-center/NotificationCenter.ts"`).
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Filled in by augmentation.
export interface Notifications {}

export type NotificationName = keyof Notifications & string

/** A notification's `[sender, args]`, or `[sender, ...]` for a whole set of names. */
type NotificationArgs<N extends NotificationName> =
	Notifications[N] extends readonly unknown[] ? Notifications[N] : never

export type Handler<N extends NotificationName> = (...args: NotificationArgs<N>) => void

// The tables store handlers for any notification.
type AnyHandler = (sender: unknown, args: unknown) => void
type SenderTable = Map<unknown, AnyHandler[]>

/**
 * Port of `Common/Notification Center/NotificationCenter.cs`: synchronous, string-named
 * notifications that any object can post and observe, from every sender or a given one. Handlers
 * may add and remove observers while a notification is being posted; that takes effect from the
 * next post.
 *
 * One instance per battle (`BattleController.notifications`), handed to the objects that post or
 * observe. They call it directly, passing themselves as the sender.
 */
export class NotificationCenter {
	/**
	 * The dictionary "key" (string) represents a notificationName property to be observed. The
	 * dictionary "value" (SenderTable) maps between sender and observer sub tables.
	 */
	readonly #table = new Map<string, SenderTable>()
	readonly #invoking = new Set<AnyHandler[]>()

	/** Observes `notificationName` from `sender`, or from every sender when `sender` is omitted. */
	addObserver<N extends NotificationName>(
		handler: Handler<N>,
		notificationName: N,
		sender: unknown = null
	): void {
		if (!this.#table.has(notificationName)) this.#table.set(notificationName, new Map())

		const subTable = this.#table.get(notificationName)!

		const key = sender ?? this

		if (!subTable.has(key)) subTable.set(key, [])

		let list = subTable.get(key)!
		if (!list.includes(handler as AnyHandler)) {
			if (this.#invoking.has(list)) subTable.set(key, (list = [...list]))

			list.push(handler as AnyHandler)
		}
	}

	removeObserver<N extends NotificationName>(
		handler: Handler<N>,
		notificationName: N,
		sender: unknown = null
	): void {
		// No need to take action if we dont monitor this notification
		const subTable = this.#table.get(notificationName)
		if (!subTable) return

		const key = sender ?? this

		let list = subTable.get(key)
		if (!list) return

		const index = list.indexOf(handler as AnyHandler)
		if (index !== -1) {
			if (this.#invoking.has(list)) subTable.set(key, (list = [...list]))
			list.splice(index, 1)
		}
	}

	/** Forgets notifications and senders that have no observers left. */
	clean(): void {
		for (const [notificationName, senderTable] of this.#table) {
			for (const [sender, handlers] of senderTable)
				if (handlers.length === 0) senderTable.delete(sender)

			if (senderTable.size === 0) this.#table.delete(notificationName)
		}
	}

	/** Calls the handlers observing `sender`, then those observing every sender. */
	postNotification<N extends NotificationName>(
		notificationName: N,
		...[sender, e]: NotificationArgs<N>
	): void {
		// No need to take action if we dont monitor this notification
		const subTable = this.#table.get(notificationName)
		if (!subTable) return

		// Post to subscribers who specified a sender to observe
		if (sender != null && subTable.has(sender)) this.#invoke(subTable.get(sender)!, sender, e)

		// Post to subscribers who did not specify a sender to observe
		if (subTable.has(this)) this.#invoke(subTable.get(this)!, sender, e)
	}

	#invoke(handlers: AnyHandler[], sender: unknown, e: unknown): void {
		this.#invoking.add(handlers)
		for (let i = 0; i < handlers.length; ++i) handlers[i]!(sender, e)
		this.#invoking.delete(handlers)
	}
}
