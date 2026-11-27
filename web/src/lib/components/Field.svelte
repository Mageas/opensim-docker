<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import type { ErrorCode } from '#lib/account-rules.js';
	import { errorText } from '#lib/error-text.js';

	interface Props extends Omit<HTMLInputAttributes, 'id' | 'name'> {
		name: string;
		label: string;
		hint?: string;
		error?: ErrorCode;
	}

	let { name, label, hint, error, ...input }: Props = $props();

	const id = $props.id();
	const hintId = `${id}-hint`;
	const errorId = `${id}-error`;
	const describedBy = $derived(
		[hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
	);
</script>

<div class="field">
	<label for={id}>{label}</label>
	{#if hint}
		<p class="hint" id={hintId}>{hint}</p>
	{/if}
	{#if error}
		<p class="error" id={errorId}>{errorText(error)}</p>
	{/if}
	<input
		{id}
		{name}
		aria-invalid={error ? 'true' : undefined}
		aria-describedby={describedBy}
		{...input}
	/>
</div>

<style>
	.field {
		display: grid;
		gap: var(--space-1);
	}

	label {
		font-weight: 600;
	}

	.hint {
		font-size: var(--font-size-small);
		color: var(--color-text-muted);
	}

	.error {
		font-size: var(--font-size-small);
		font-weight: 600;
		color: var(--color-danger);
	}

	input {
		width: 100%;
		min-height: var(--target-size);
		margin-top: var(--space-1);
		padding: var(--space-2) var(--space-3);
		border: var(--border-width) solid var(--color-border);
		border-radius: var(--radius-small);
		background: var(--color-surface);
	}

	input:hover {
		border-color: var(--color-text-muted);
	}

	input:focus-visible {
		outline-offset: 0;
		border-color: var(--color-focus);
	}

	input[aria-invalid='true'] {
		border-color: var(--color-danger);
		box-shadow: inset 0 0 0 1px var(--color-danger);
	}
</style>
