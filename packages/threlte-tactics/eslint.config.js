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
			// Ported overridable methods keep Unity's parameters even where the base ignores them.
			"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
		}
	},
	{
		files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
		languageOptions: {
			parserOptions: {
				projectService: true,
				extraFileExtensions: [".svelte"],
				parser: ts.parser,
				// Mirrors the compiler options in vite.config.ts (there is no svelte.config.js to read).
				svelteConfig: { compilerOptions: { experimental: { async: true } } }
			}
		}
	},
	{
		// Override or add rule settings here, such as:
		// 'svelte/button-has-type': 'error'
		rules: {
			"svelte/block-lang": "off"
		}
	}
)
