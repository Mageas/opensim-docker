<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
</script>

<svelte:head>
	<title>{m.error_title()}</title>
</svelte:head>

<section class="card stack error" aria-labelledby="error-title">
	<p class="eyebrow">{page.status}</p>
	<h1 id="error-title">{m.error_title()}</h1>
	<p class="muted">{page.status === 404 ? m.error_not_found() : m.error_server()}</p>
	{#if page.error?.id}
		<p class="muted small">{m.error_reference({ id: page.error.id })}</p>
	{/if}
	<p><a class="button secondary" href={resolve('/')}>{m.error_home()}</a></p>
</section>

<style>
	.error {
		max-width: var(--width-column);
		margin-inline: auto;
	}
</style>
