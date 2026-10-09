import { EquipSlots } from "#lib/enums/EquipSlots.ts"
import type { Feature, FeatureTarget } from "#lib/view-model-component/features/Feature.ts"

/** Port of `View Model Component/Item/Equippable.cs`: an item whose features last while worn. */
export class Equippable {
	/** The features the item grants while worn. */
	readonly features: readonly Feature[]

	/**
	 * The EquipSlots flag which is the default equip location(s) for this item. For example, a
	 * normal weapon would only specify primary, but a two-handed weapon would specify both primary
	 * and secondary.
	 */
	defaultSlots: EquipSlots = EquipSlots.None

	/**
	 * Some equipment may be allowed to be equipped in more than one slot location, such as when
	 * dual-wielding swords.
	 */
	secondarySlots: EquipSlots = EquipSlots.None

	/** The slot(s) where an item is currently equipped */
	slots: EquipSlots = EquipSlots.None

	#isEquipped = false

	constructor(
		features: readonly Feature[],
		{
			defaultSlots = EquipSlots.None,
			secondarySlots = EquipSlots.None
		}: { defaultSlots?: EquipSlots; secondarySlots?: EquipSlots } = {}
	) {
		this.features = features
		this.defaultSlots = defaultSlots
		this.secondarySlots = secondarySlots
	}

	/** Activates the features on `owner`, the unit wearing the item. */
	onEquip(owner: FeatureTarget): void {
		if (this.#isEquipped) return

		this.#isEquipped = true

		for (const feature of this.features) feature.activate(owner)
	}

	onUnEquip(): void {
		if (!this.#isEquipped) return

		this.#isEquipped = false

		for (const feature of this.features) feature.deactivate()
	}
}
