/** @type {import("prettier").Config} */
const config = {
	useTabs: true,
	singleQuote: false,
	trailingComma: "none",
	printWidth: 100,
	semi: false,
	experimentalTernaries: true,
	plugins: ["prettier-plugin-svelte"],
	overrides: [{ files: "*.svelte", options: { parser: "svelte" } }]
}

export default config
