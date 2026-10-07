// The UI textures from `Textures/UI`, imported as Unity "Sprite (2D and UI)" assets. `border` is
// the 9-slice border from each texture's import settings (`spriteBorder` in the `.meta`), in
// pixels.
import AbilityMenu from "./AbilityMenu.png"
import ActionNameBacker from "./ActionNameBacker.png"
import AttackArrowBacker from "./AttackArrowBacker.png"
import AttackArrowFill from "./AttackArrowFill.png"
import Avatar from "./Avatar.png"
import BlueAttackPanel from "./BlueAttackPanel.png"
import ConversationPanel from "./ConversationPanel.png"
import EvilAvatar from "./EvilAvatar.png"
import MenuBullet from "./MenuBullet.png"
import MenuBulletLocked from "./MenuBulletLocked.png"
import MenuBulletSelected from "./MenuBulletSelected.png"
import MoreConversationArrow from "./MoreConversationArrow.png"
import RedAttackPanel from "./RedAttackPanel.png"

export interface SpriteBorder {
	left: number
	top: number
	right: number
	bottom: number
}

export interface Sprite {
	src: string
	width: number
	height: number
	border?: SpriteBorder
}

export const sprites = {
	AbilityMenu: {
		src: AbilityMenu,
		width: 48,
		height: 77,
		border: { left: 44, top: 42, right: 1, bottom: 32 }
	},
	ActionNameBacker: {
		src: ActionNameBacker,
		width: 16,
		height: 60,
		border: { left: 8, top: 0, right: 8, bottom: 0 }
	},
	AttackArrowBacker: { src: AttackArrowBacker, width: 192, height: 81 },
	AttackArrowFill: { src: AttackArrowFill, width: 160, height: 49 },
	Avatar: { src: Avatar, width: 154, height: 227 },
	BlueAttackPanel: {
		src: BlueAttackPanel,
		width: 50,
		height: 116,
		border: { left: 3, top: 0, right: 47, bottom: 0 }
	},
	ConversationPanel: {
		src: ConversationPanel,
		width: 74,
		height: 140,
		border: { left: 71, top: 70, right: 2, bottom: 70 }
	},
	EvilAvatar: { src: EvilAvatar, width: 154, height: 227 },
	MenuBullet: { src: MenuBullet, width: 19, height: 19 },
	MenuBulletLocked: { src: MenuBulletLocked, width: 19, height: 19 },
	MenuBulletSelected: { src: MenuBulletSelected, width: 19, height: 19 },
	MoreConversationArrow: { src: MoreConversationArrow, width: 33, height: 24 },
	RedAttackPanel: {
		src: RedAttackPanel,
		width: 50,
		height: 117,
		border: { left: 3, top: 0, right: 47, bottom: 0 }
	}
} as const satisfies Record<string, Sprite>

export type SpriteName = keyof typeof sprites
