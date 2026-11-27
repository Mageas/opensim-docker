import { tick } from 'svelte';
import type { SubmitFunction } from '$app/forms';

/**
 * `use:enhance` handler: after a refused submission, moves focus to the form's alert or to
 * its first invalid field, so keyboard and screen reader users land on the problem.
 */
export const focusOnError: SubmitFunction = () => {
	return async ({ result, update, formElement }) => {
		await update();
		if (result.type !== 'failure') return;
		await tick();
		formElement.querySelector<HTMLElement>('[data-form-alert], [aria-invalid="true"]')?.focus();
	};
};
