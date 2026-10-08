import { describe, expect, test, vi } from "vitest"
import { NotificationCenter } from "#lib/common/notification-center/NotificationCenter.ts"
import { EquipSlots } from "#lib/enums/EquipSlots.ts"
import { StatTypes } from "#lib/enums/StatTypes.ts"
import { Equipment } from "#lib/view-model-component/actor/Equipment.ts"
import { StatModifierFeature } from "#lib/view-model-component/features/StatModifierFeature.ts"
import { Unit } from "#lib/view-model-component/Unit.svelte.ts"
import { Consumable } from "./Consumable.ts"
import { Equippable } from "./Equippable.ts"

/** The blog's TestItems demo, as tests. */
function hero() {
	const notifications = new NotificationCenter()
	const unit = new Unit({ name: "Hero", model: "Hero", notifications })
	const { stats, equipment } = unit
	stats.set(StatTypes.HP, 500)
	stats.set(StatTypes.MHP, 500)
	stats.set(StatTypes.ATK, 30)
	stats.set(StatTypes.DEF, 40)
	return { notifications, unit, stats, equipment }
}

const equippable = (type: StatTypes, amount: number, defaultSlots: EquipSlots) =>
	new Equippable([new StatModifierFeature(type, amount)], { defaultSlots })

const sword = () => equippable(StatTypes.ATK, 10, EquipSlots.Primary)
const broadSword = () => equippable(StatTypes.ATK, 15, EquipSlots.Primary | EquipSlots.Secondary)
const shield = () => equippable(StatTypes.DEF, 10, EquipSlots.Secondary)

describe("StatModifierFeature", () => {
	test("activates once and deactivates once", () => {
		const { unit, stats } = hero()
		const feature = new StatModifierFeature(StatTypes.ATK, 5)
		feature.activate(unit)
		feature.activate(unit)
		expect(stats.get(StatTypes.ATK)).toBe(35)
		feature.deactivate()
		feature.deactivate()
		expect(stats.get(StatTypes.ATK)).toBe(30)
	})

	test("applies permanently", () => {
		const { unit, stats } = hero()
		const feature = new StatModifierFeature(StatTypes.ATK, 5)
		feature.apply(unit)
		feature.deactivate()
		feature.apply(unit)
		expect(stats.get(StatTypes.ATK)).toBe(40)
	})
})

describe("Consumable", () => {
	test("applies its features to the target", () => {
		const { unit, stats } = hero()
		new Consumable([new StatModifierFeature(StatTypes.HP, -150)]).consume(unit)
		expect(stats.get(StatTypes.HP)).toBe(350)
	})
})

describe("Equipment", () => {
	test("equipping activates the item's features until it's taken off", () => {
		const { stats, equipment } = hero()
		const item = sword()
		equipment.equip(item, item.defaultSlots)
		expect(stats.get(StatTypes.ATK)).toBe(40)
		expect(equipment.items).toEqual([item])
		expect(item.slots).toBe(EquipSlots.Primary)

		equipment.unEquip(item)
		expect(stats.get(StatTypes.ATK)).toBe(30)
		expect(equipment.items).toEqual([])
		expect(item.slots).toBe(EquipSlots.None)
	})

	test("equipping takes off whatever is in the item's slots", () => {
		const { stats, equipment } = hero()
		const [s, b, h] = [sword(), broadSword(), shield()]
		equipment.equip(s, s.defaultSlots)
		equipment.equip(h, h.defaultSlots)
		expect([stats.get(StatTypes.ATK), stats.get(StatTypes.DEF)]).toEqual([40, 50])

		equipment.equip(b, b.defaultSlots)
		expect(equipment.items).toEqual([b])
		expect([stats.get(StatTypes.ATK), stats.get(StatTypes.DEF)]).toEqual([45, 40])

		equipment.equip(h, h.defaultSlots)
		expect(equipment.items).toEqual([h])
		expect(equipment.getItem(EquipSlots.Primary)).toBeNull()
		expect(equipment.getItem(EquipSlots.Primary | EquipSlots.Secondary)).toBe(h)
	})

	test("posts notifications for each item equipped and taken off", () => {
		const { notifications, equipment } = hero()
		const equipped = vi.fn()
		const unEquipped = vi.fn()
		notifications.addObserver(equipped, Equipment.equippedNotification)
		notifications.addObserver(unEquipped, Equipment.unEquippedNotification, equipment)
		const [s, b] = [sword(), broadSword()]
		equipment.equip(s, s.defaultSlots)
		equipment.equip(b, b.defaultSlots)
		expect(equipped.mock.calls).toEqual([
			[equipment, s],
			[equipment, b]
		])
		expect(unEquipped.mock.calls).toEqual([[equipment, s]])
	})
})
