<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';

	let { grid }: { grid: { name: string; loginUri: string } } = $props();

	// The copy button needs JavaScript and the Clipboard API: without them, the URI stays selectable.
	let canCopy = $state(false);
	let copied = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		canCopy = navigator.clipboard !== undefined;
		return () => clearTimeout(timer);
	});

	async function copy() {
		await navigator.clipboard.writeText(grid.loginUri);
		copied = true;
		clearTimeout(timer);
		timer = setTimeout(() => (copied = false), 2000);
	}
</script>

<section class="card stack" aria-labelledby="connect-title">
	<h2 id="connect-title">{m.connect_title()}</h2>
	<ol class="steps">
		<li class="stack">
			<p>{m.connect_step_install()}</p>
			<p>
				<a href="https://www.firestormviewer.org/downloads/" rel="external">
					{m.connect_download()}
				</a>
			</p>
		</li>
		<li class="stack">
			<p>{m.connect_step_grid()}</p>
			<div class="uri">
				<code>{grid.loginUri}</code>
				{#if canCopy}
					<button
						class="button secondary small"
						type="button"
						aria-label={copied ? m.copied() : m.copy_label()}
						onclick={copy}
					>
						{copied ? m.copied() : m.copy()}
					</button>
				{/if}
			</div>
		</li>
		<li>
			<p>{m.connect_step_login({ grid: grid.name })}</p>
		</li>
	</ol>
</section>

<style>
	.steps {
		display: grid;
		gap: var(--space-5);
		padding: 0;
		list-style: none;
		counter-reset: step;
	}

	.steps > li {
		position: relative;
		padding-left: calc(var(--space-8) + var(--space-3));
		counter-increment: step;
		gap: var(--space-2);
	}

	.steps > li::before {
		content: counter(step);
		position: absolute;
		left: 0;
		top: 0;
		display: grid;
		place-items: center;
		width: var(--space-8);
		height: var(--space-8);
		border-radius: var(--radius-round);
		background: var(--color-accent-soft);
		color: var(--color-accent);
		font-weight: 700;
	}

	.uri {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
		padding: var(--space-2) var(--space-2) var(--space-2) var(--space-3);
		border: var(--border-width) solid var(--color-border-subtle);
		border-radius: var(--radius-small);
		background: var(--color-surface-muted);
	}

	code {
		flex: 1;
		min-width: 0;
		overflow-wrap: anywhere;
	}
</style>
