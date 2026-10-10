/** A binary min-heap of integer items by integer priority; ties come out lowest item first. */
export class MinHeap {
	readonly #items: number[] = []
	readonly #priorities: number[] = []

	get size(): number {
		return this.#items.length
	}

	push(item: number, priority: number) {
		const items = this.#items
		const priorities = this.#priorities
		let i = items.length
		items.push(item)
		priorities.push(priority)
		while (i > 0) {
			const parent = (i - 1) >> 1
			if (!this.#less(i, parent)) break
			this.#swap(i, parent)
			i = parent
		}
	}

	/** The item with the lowest priority, removed; undefined when empty. */
	pop(): { item: number; priority: number } | undefined {
		const items = this.#items
		const priorities = this.#priorities
		if (items.length === 0) return undefined
		const top = { item: items[0], priority: priorities[0] }
		const lastItem = items.pop() as number
		const lastPriority = priorities.pop() as number
		if (items.length > 0) {
			items[0] = lastItem
			priorities[0] = lastPriority
			let i = 0
			for (;;) {
				const left = 2 * i + 1
				const right = left + 1
				let smallest = i
				if (left < items.length && this.#less(left, smallest)) smallest = left
				if (right < items.length && this.#less(right, smallest)) smallest = right
				if (smallest === i) break
				this.#swap(i, smallest)
				i = smallest
			}
		}
		return top
	}

	#less(a: number, b: number): boolean {
		const pa = this.#priorities[a]
		const pb = this.#priorities[b]
		return pa < pb || (pa === pb && this.#items[a] < this.#items[b])
	}

	#swap(a: number, b: number) {
		const items = this.#items
		const priorities = this.#priorities
		;[items[a], items[b]] = [items[b], items[a]]
		;[priorities[a], priorities[b]] = [priorities[b], priorities[a]]
	}
}
