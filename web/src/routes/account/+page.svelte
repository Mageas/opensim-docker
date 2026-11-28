<script lang="ts">
	import { resolve } from '$app/paths';
	import ConnectInfo from '#lib/components/ConnectInfo.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { getLocale } from '#lib/paraglide/runtime.js';
	import type { PageProps } from './$types.js';

	let { data }: PageProps = $props();

	const initials = $derived(
		`${data.account.firstName[0]}${data.account.lastName[0]}`.toUpperCase()
	);

	// UTC on both sides, so the server and the browser render the same text.
	const dateTime = new Intl.DateTimeFormat(getLocale(), {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZone: 'UTC',
		timeZoneName: 'short'
	});
	const date = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'long', timeZone: 'UTC' });
</script>

<svelte:head>
	<title>{m.page_title({ page: m.account_title(), grid: data.grid.name })}</title>
</svelte:head>

<div class="stack-large">
	{#if data.notice === 'created'}
		<p class="notice" role="status">{m.account_created_notice()}</p>
	{:else if data.notice === 'password'}
		<p class="notice" role="status">{m.account_password_notice()}</p>
	{/if}

	<section class="card head" aria-labelledby="account-name">
		<span class="initials" aria-hidden="true">{initials}</span>
		<div class="name">
			<p class="eyebrow">{m.account_title()}</p>
			<h1 id="account-name">{data.account.firstName} {data.account.lastName}</h1>
		</div>
		<p class="status" class:online={data.account.online}>
			{data.account.online ? m.account_online() : m.account_offline()}
		</p>
	</section>

	<div class="split">
		<div class="stack-large">
			<section class="card stack" aria-labelledby="details-title">
				<h2 id="details-title">{m.account_details()}</h2>
				<dl>
					<div>
						<dt>{m.account_member_since()}</dt>
						<dd>
							{#if data.account.createdAt}
								<time datetime={data.account.createdAt.toISOString()}>
									{date.format(data.account.createdAt)}
								</time>
							{:else}
								{m.account_never()}
							{/if}
						</dd>
					</div>
					<div>
						<dt>{m.account_last_login()}</dt>
						<dd>
							{#if data.account.lastLoginAt}
								<time datetime={data.account.lastLoginAt.toISOString()}>
									{dateTime.format(data.account.lastLoginAt)}
								</time>
							{:else}
								{m.account_never()}
							{/if}
						</dd>
					</div>
					<div class="wide">
						<dt>{m.account_uuid()}</dt>
						<dd><code>{data.account.id}</code></dd>
					</div>
				</dl>
			</section>

			{#if data.paymentsEnabled}
				<section class="card stack" aria-labelledby="payment-title">
					<h2 id="payment-title">{m.account_payment_title()}</h2>
					<p class="muted">{m.account_payment_text()}</p>
					<p>
						<a class="button secondary" href={resolve('/account/payment')}>
							{m.account_payment_link()}
						</a>
					</p>
				</section>
			{/if}

			<section class="card stack" aria-labelledby="password-title">
				<h2 id="password-title">{m.account_password_title()}</h2>
				<p class="muted">{m.account_password_text()}</p>
				<p>
					<a class="button secondary" href={resolve('/account/password')}>
						{m.account_change_password()}
					</a>
				</p>
			</section>

			<section class="card stack" aria-labelledby="delete-title">
				<h2 id="delete-title">{m.account_delete_title()}</h2>
				<p class="muted">{m.account_delete_text()}</p>
				<p>
					<a class="button danger-outline" href={resolve('/account/delete')}>
						{m.account_delete()}
					</a>
				</p>
			</section>
		</div>

		<ConnectInfo grid={data.grid} />
	</div>
</div>

<style>
	.head {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-4) var(--space-5);
		align-items: center;
	}

	.initials {
		display: grid;
		flex: none;
		place-items: center;
		width: 3.5rem;
		height: 3.5rem;
		border-radius: var(--radius-round);
		background: var(--color-accent);
		color: var(--color-on-accent);
		font-size: var(--font-size-heading);
		font-weight: 700;
	}

	/* Takes the row when it can, and pushes the status badge below on narrow screens. */
	.name {
		flex: 1 1 12rem;
		min-width: 0;
	}

	h1 {
		overflow-wrap: break-word;
	}

	.status {
		display: inline-flex;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-1) var(--space-3);
		border: var(--border-width) solid var(--color-border-subtle);
		border-radius: var(--radius-round);
		font-size: var(--font-size-small);
		font-weight: 600;
		color: var(--color-text-muted);
	}

	.status::before {
		content: '';
		width: var(--space-2);
		height: var(--space-2);
		border-radius: var(--radius-round);
		background: var(--color-border);
	}

	.status.online {
		border-color: var(--color-success);
		background: var(--color-success-soft);
		color: var(--color-success);
	}

	.status.online::before {
		background: var(--color-success);
	}

	dl {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
		gap: var(--space-4) var(--space-6);
	}

	.wide {
		grid-column: 1 / -1;
	}

	dt {
		font-size: var(--font-size-small);
		color: var(--color-text-muted);
	}

	dd {
		font-weight: 600;
		overflow-wrap: anywhere;
	}

	dd code {
		font-weight: 400;
	}
</style>
