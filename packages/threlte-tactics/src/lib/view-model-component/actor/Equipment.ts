import type { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { EquipSlots } from "#lib/enums/EquipSlots.ts"
import type { FeatureTarget } from "#lib/view-model-component/features/Feature.ts"
import type { Equippable } from "#lib/view-model-component/item/Equippable.ts"

declare module "#lib/common/notification-center/NotificationCenter.ts" {
	interface Notifications {
		"Equipment.EquippedNotification": [sender: Equipment, item: Equippable]
		"Equipment.UnEquippedNotification": [sender: Equipment, item: Equippable]
	}
}

/**
 * Port of `View Model Component/Actor/Equipment.cs`: the items a unit wears. Equipping an item
 * first takes off whatever occupies any of its slots.
 */
export class Equipment {
	static readonly equippedNotification = "Equipment.EquippedNotification"
	static readonly unEquippedNotification = "Equipment.UnEquippedNotification"

	readonly #items: Equippable[] = []
	readonly #owner: FeatureTarget
	readonly #notifications: NotificationCenter

	/** `owner`: the unit wearing the equipment. */
	constructor(owner: FeatureTarget, notifications: NotificationCenter) {
		this.#owner = owner
		this.#notifications = notifications
	}

	get items(): readonly Equippable[] {
		return this.#items
	}

	equip(item: Equippable, slots: EquipSlots): void {
		this.unEquip(slots)

		this.#items.push(item)
		item.slots = slots
		item.onEquip(this.#owner)

		this.#notifications.postNotification(Equipment.equippedNotification, this, item)
	}

	/** Takes off `item`, or every item in any of the `slots`. */
	unEquip(item: Equippable): void
	unEquip(slots: EquipSlots): void
	unEquip(itemOrSlots: Equippable | EquipSlots): void {
		if (typeof itemOrSlots === "number") {
			const slots = itemOrSlots
			for (let i = this.#items.length - 1; i >= 0; --i) {
				const item = this.#items[i]!
				if ((item.slots & slots) !== EquipSlots.None) this.unEquip(item)
			}
			return
		}

		const item = itemOrSlots
		item.onUnEquip()
		item.slots = EquipSlots.None
		const index = this.#items.indexOf(item)
		if (index !== -1) this.#items.splice(index, 1)

		this.#notifications.postNotification(Equipment.unEquippedNotification, this, item)
	}

	/** The item in any of the `slots`, if one is equipped there. */
	getItem(slots: EquipSlots): Equippable | null {
		for (let i = this.#items.length - 1; i >= 0; --i) {
			const item = this.#items[i]!
			if ((item.slots & slots) !== EquipSlots.None) return item
		}
		return null
	}
}
