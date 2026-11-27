<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Field from '#lib/components/Field.svelte';
	import FormAlert from '#lib/components/FormAlert.svelte';
	import { focusOnError } from '#lib/enhance.js';
	import { errorText } from '#lib/error-text.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types.js';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.page_title({ page: m.delete_title(), grid: data.grid.name })}</title>
</svelte:head>

<div class="stack form-page">
	<p><a href={resolve('/account')}>{m.back_to_account()}</a></p>
	<div class="split">
		<section class="card stack" aria-labelledby="delete-title">
			<h1 id="delete-title">{m.delete_title()}</h1>
			{#if data.blocker}
				<p class="alert">{errorText(data.blocker)}</p>
			{:else}
				<p class="muted">
					{m.delete_intro({ name: `${data.user?.firstName} ${data.user?.lastName}` })}
				</p>
				<form class="stack" method="POST" use:enhance={focusOnError} novalidate>
					<FormAlert code={form?.error} />
					<Field
						name="password"
						type="password"
						label={m.field_password()}
						hint={m.delete_confirm()}
						error={form?.errors?.password}
						autocomplete="current-password"
						required
					/>
					<button class="button danger full" type="submit">{m.delete_submit()}</button>
				</form>
			{/if}
		</section>

		<aside class="panel stack" aria-label={m.delete_title()}>
			<div class="stack">
				<h2>{m.delete_removed_title()}</h2>
				<ul class="checklist">
					<li>{m.delete_removed_inventory()}</li>
					<li>{m.delete_removed_social()}</li>
					<li>{m.delete_removed_profile()}</li>
					<li>{m.delete_removed_groups()}</li>
				</ul>
			</div>
			<div class="stack">
				<h2>{m.delete_kept_title()}</h2>
				<ul class="checklist">
					<li>{m.delete_kept_objects()}</li>
				</ul>
			</div>
		</aside>
	</div>
</div>
