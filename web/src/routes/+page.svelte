<script lang="ts">
	import { resolve } from '$app/paths';
	import ConnectInfo from '#lib/components/ConnectInfo.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types.js';

	let { data }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.grid.name}</title>
</svelte:head>

<div class="stack-large">
	{#if data.deleted}
		<p class="notice" role="status">{m.home_deleted()}</p>
	{/if}

	<div class="split hero">
		<section class="stack intro" aria-labelledby="home-title">
			<p class="eyebrow">{m.home_eyebrow()}</p>
			<h1 id="home-title">{data.grid.name}</h1>
			<p class="lead">{m.home_intro({ grid: data.grid.name })}</p>
			<p class="actions">
				<a class="button" href={resolve('/signup')}>{m.nav_signup()}</a>
				<a class="button secondary" href={resolve('/login')}>{m.nav_login()}</a>
			</p>
		</section>
		<ConnectInfo grid={data.grid} />
	</div>
</div>

<style>
	.hero {
		align-items: center;
		gap: var(--space-section);
	}

	.intro {
		gap: var(--space-5);
	}

	h1 {
		font-size: var(--font-size-display);
		line-height: 1.05;
		overflow-wrap: anywhere;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		padding-top: var(--space-2);
	}
</style>
