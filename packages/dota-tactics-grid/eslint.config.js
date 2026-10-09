import prettier from "eslint-config-prettier"
import path from "node:path"
import js from "@eslint/js"
import svelte from "eslint-plugin-svelte"
import { defineConfig, includeIgnoreFile } from "eslint/config"
import globals from "globals"
import ts from "typescript-eslint"

const gitignorePath = path.resolve(import.meta.dirname, ".gitignore")

export default defineConfig(
	includeIgnoreFile(gitignorePath),
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.all,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// typescript-eslint strongly recommend that you do not use the no-undef lint rule on TypeScript projects.
			// see: https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule-about-global-variables-not-being-defined-even-though-there-are-no-typescript-errors
			"no-undef": "off",
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
		}
	},
	{
		files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: [".svelte"],
				parser: ts.parser
			}
		}
	},
	{
		rules: {
			"svelte/block-lang": "off",
			// Swatches and labels are positioned and coloured from data.
			"svelte/no-inline-styles": "off",
			// Ids aren't unique once a component renders more than once.
			"svelte/consistent-selector-style": ["error", { style: ["type", "class"] }],
			// The FFT window chrome is shared by every panel, so it lives in app.css.
			"svelte/no-unused-class-name": ["error", { allowedClassNames: ["win"] }]
		}
	}
)
