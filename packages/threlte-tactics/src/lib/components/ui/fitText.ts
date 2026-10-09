import type { Attachment } from "svelte/attachments"

/**
 * Best fit: sets the element's font size to the largest whole size in [min, max] at which its
 * content (its first child) fits inside it. Takes the text so that it runs again when that changes.
 */
export function fitText(_text: string, [min, max]: [number, number]): Attachment<HTMLElement> {
	return (box) => {
		const content = box.firstElementChild as HTMLElement
		for (let size = max; size >= min; --size) {
			box.style.fontSize = `${size}px`
			if (content.offsetWidth <= box.clientWidth && content.offsetHeight <= box.clientHeight) break
		}
	}
}
