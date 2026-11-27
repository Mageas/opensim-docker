<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import type { SubmitFunction } from '$app/forms';
	import { m } from '#lib/paraglide/messages.js';

	/**
	 * Two buttons, one per target theme; CSS shows the one that leads away from the theme
	 * on screen, including the system's when no choice is saved. Without JavaScript the
	 * form posts, the server saves the choice and sends the visitor back to this page.
	 */
	const applyAtOnce: SubmitFunction = ({ formData }) => {
		const theme = formData.get('theme');
		if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme;
		// The server saves the cookie; its redirect back to this page needs no navigation.
		return async ({ result, update }) => {
			if (result.type !== 'redirect') await update();
		};
	};
</script>

<form class="switch" method="POST" action={resolve('/theme')} use:enhance={applyAtOnce}>
	<input type="hidden" name="redirectTo" value={page.url.pathname} />
	<button class="to-dark" type="submit" name="theme" value="dark" aria-label={m.theme_to_dark()}>
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
		</svg>
	</button>
	<button class="to-light" type="submit" name="theme" value="light" aria-label={m.theme_to_light()}>
		<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
			/>
		</svg>
	</button>
</form>

<style>
	button {
		display: inline-grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		padding: 0;
		border: var(--border-width) solid var(--color-border-subtle);
		border-radius: var(--radius-small);
		background: var(--color-surface);
		color: var(--color-text);
		cursor: pointer;
	}

	button:hover {
		border-color: var(--color-border);
	}

	svg {
		width: 1.125rem;
		height: 1.125rem;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.to-light {
		display: none;
	}

	:global(:root[data-theme='dark']) .to-dark {
		display: none;
	}

	:global(:root[data-theme='dark']) .to-light {
		display: inline-grid;
	}

	@media (prefers-color-scheme: dark) {
		:global(:root:not([data-theme='light'])) .to-dark {
			display: none;
		}

		:global(:root:not([data-theme='light'])) .to-light {
			display: inline-grid;
		}
	}
</style>
