<script lang="ts">
	import "../app.css"
	import favicon from "#lib/assets/favicon.svg"
	import type { LayoutProps } from "./$types"

	let { children }: LayoutProps = $props()
</script>

<svelte:head>
	<link href={favicon} rel="icon" />
	<link href="https://fonts.googleapis.com" rel="preconnect" />
	<link
		href="https://fonts.googleapis.com/css2?family=Spectral+SC:wght@500;700&family=IBM+Plex+Sans:wght@400;500&family=IBM+Plex+Mono:wght@400;500&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{@render children()}
