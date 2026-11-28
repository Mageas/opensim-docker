<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types.js';

	let { data }: PageProps = $props();

	// Stripe gives brands in lowercase, such as "visa" or "mastercard".
	const brand = $derived(
		data.card ? data.card.brand.charAt(0).toUpperCase() + data.card.brand.slice(1) : ''
	);
</script>

<svelte:head>
	<title>{m.page_title({ page: m.payment_title(), grid: data.grid.name })}</title>
</svelte:head>

<div class="stack form-page">
	<p><a href={resolve('/account')}>{m.back_to_account()}</a></p>
	{#if data.notice === 'saved'}
		<p class="notice" role="status">{m.payment_saved_notice()}</p>
	{:else if data.notice === 'removed'}
		<p class="notice" role="status">{m.payment_removed_notice()}</p>
	{:else if data.notice === 'purchase'}
		<p class="notice" role="status">{m.payment_purchase_notice()}</p>
	{:else if data.notice === 'purchase_failed'}
		<p class="alert" role="alert">{m.payment_purchase_failed()}</p>
	{:else if data.notice === 'failed'}
		<p class="alert" role="alert">{m.payment_setup_failed()}</p>
	{/if}
	<div class="split">
		<section class="card stack" aria-labelledby="payment-title">
			<h1 id="payment-title">{m.payment_title()}</h1>
			<p class="muted">{m.payment_intro()}</p>
			{#if data.card}
				<p class="saved-card">{m.payment_card({ brand, last4: data.card.last4 })}</p>
			{:else}
				<p>{m.payment_none()}</p>
			{/if}
			<!-- Without enhance: the redirect leads to Stripe, another site. -->
			<form method="POST" action="?/save">
				<button class="button full" type="submit">
					{data.card ? m.payment_replace() : m.payment_save()}
				</button>
			</form>
			{#if data.card}
				<form method="POST" action="?/remove" use:enhance>
					<button class="button danger-outline full" type="submit">{m.payment_remove()}</button>
				</form>
			{/if}
		</section>

		<aside class="panel stack" aria-labelledby="payment-how-title">
			<h2 id="payment-how-title">{m.payment_how_title()}</h2>
			<ul class="checklist">
				<li>{m.payment_how_viewer()}</li>
				<li>{m.payment_how_password()}</li>
				<li>{m.payment_how_bank()}</li>
				<li>{m.payment_how_secure()}</li>
			</ul>
		</aside>
	</div>
</div>

<style>
	.saved-card {
		font-weight: 600;
	}
</style>
