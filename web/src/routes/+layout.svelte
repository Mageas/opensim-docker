<script lang="ts">
	import '#lib/styles/theme.css';
	import '#lib/styles/base.css';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
	import ThemeSwitch from '#lib/components/ThemeSwitch.svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { LayoutProps } from './$types.js';

	let { data, children }: LayoutProps = $props();

	const current = (path: string) => (page.url.pathname === path ? 'page' : undefined);
</script>

<a class="skip-link" href="#main">{m.skip_link()}</a>

<header class="site-header">
	<div class="container bar">
		<a class="brand" href={resolve('/')}>
			<Logo />
			<span>{data.grid.name}</span>
		</a>
		<nav aria-label={m.nav_label()}>
			<ul>
				{#if data.user}
					<li>
						<a class="nav-link" href={resolve('/account')} aria-current={current('/account')}>
							{m.nav_account()}
						</a>
					</li>
					<li>
						<form method="POST" action={resolve('/logout')} use:enhance>
							<button class="button secondary small" type="submit">{m.nav_logout()}</button>
						</form>
					</li>
				{:else}
					<li>
						<a class="nav-link" href={resolve('/login')} aria-current={current('/login')}>
							{m.nav_login()}
						</a>
					</li>
					<li>
						<a class="button small" href={resolve('/signup')} aria-current={current('/signup')}>
							{m.nav_signup()}
						</a>
					</li>
				{/if}
				<li><ThemeSwitch /></li>
			</ul>
		</nav>
	</div>
</header>

<main id="main" class="container" tabindex="-1">
	{@render children()}
</main>

<footer class="site-footer">
	<div class="container">
		<p>
			{data.grid.name} · {m.footer_runs_on()}
			<a href="https://opensimulator.org/" rel="external">{m.footer_opensim()}</a>
		</p>
	</div>
</footer>

<style>
	.skip-link {
		position: absolute;
		left: var(--space-4);
		top: calc(-1 * var(--space-12));
		z-index: 1;
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-small);
		background: var(--color-surface);
	}

	.skip-link:focus {
		top: var(--space-2);
	}

	.site-header {
		border-bottom: var(--border-width) solid var(--color-border-subtle);
		background: var(--color-surface);
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-6);
		align-items: center;
		justify-content: space-between;
		min-height: 4rem;
		padding-block: var(--space-3);
	}

	.brand {
		display: inline-flex;
		gap: var(--space-3);
		align-items: center;
		font-size: var(--font-size-heading);
		font-weight: 700;
		letter-spacing: var(--letter-spacing-tight);
		color: var(--color-text);
		text-decoration: none;
	}

	.brand :global(.logo) {
		color: var(--color-accent);
	}

	ul {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-5);
		align-items: center;
		padding: 0;
		list-style: none;
	}

	.nav-link {
		font-weight: 600;
		color: var(--color-text);
		text-decoration: none;
	}

	.nav-link:hover,
	.nav-link[aria-current='page'] {
		color: var(--color-accent);
	}

	main {
		flex: 1;
		padding-block: var(--space-section);
	}

	main:focus {
		outline: none;
	}

	.site-footer {
		padding-block: var(--space-6);
		border-top: var(--border-width) solid var(--color-border-subtle);
		font-size: var(--font-size-small);
		color: var(--color-text-muted);
	}
</style>
