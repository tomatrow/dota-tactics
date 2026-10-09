/** Port of `Enums/EquipSlots.cs`: where an item is equipped (bit flags, combinable). */
export const EquipSlots = {
	None: 0,
	/** usually a weapon (sword etc) */
	Primary: 1 << 0,
	/** usually a shield, but could be another sword (dual-wield) or occupied by two-handed weapon */
	Secondary: 1 << 1,
	/** helmet, hat, etc */
	Head: 1 << 2,
	/** body armor, robe, etc */
	Body: 1 << 3,
	/** ring, belt, etc */
	Accessory: 1 << 4
} as const

/** One or more slots (a bit mask), e.g. `EquipSlots.Primary | EquipSlots.Secondary`. */
export type EquipSlots = number
