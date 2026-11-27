<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Field from '#lib/components/Field.svelte';
	import FormAlert from '#lib/components/FormAlert.svelte';
	import { NAME_MAX_LENGTH, NAME_MIN_LENGTH, PASSWORD_MIN_LENGTH } from '#lib/account-rules.js';
	import { focusOnError } from '#lib/enhance.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types.js';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.page_title({ page: m.signup_title(), grid: data.grid.name })}</title>
</svelte:head>

{#if data.signupEnabled}
	<div class="split form-page">
		<section class="card stack" aria-labelledby="signup-title">
			<h1 id="signup-title">{m.signup_title()}</h1>
			<p class="muted">{m.signup_intro()}</p>
			<form class="stack" method="POST" use:enhance={focusOnError} novalidate>
				<FormAlert code={form?.error} />
				<Field
					name="avatarName"
					label={m.field_avatar_name()}
					hint={m.hint_avatar_name_new({ min: NAME_MIN_LENGTH, max: NAME_MAX_LENGTH })}
					error={form?.errors?.avatarName}
					defaultValue={form?.values?.avatarName}
					autocomplete="username"
					autocapitalize="words"
					spellcheck="false"
					required
				/>
				<Field
					name="password"
					type="password"
					label={m.field_password()}
					hint={m.hint_password_new({ min: PASSWORD_MIN_LENGTH })}
					error={form?.errors?.password}
					autocomplete="new-password"
					required
				/>
				<Field
					name="passwordConfirm"
					type="password"
					label={m.field_password_confirm()}
					error={form?.errors?.passwordConfirm}
					autocomplete="new-password"
					required
				/>
				<button class="button full" type="submit">{m.signup_submit()}</button>
			</form>
		</section>

		<aside class="panel stack" aria-labelledby="signup-aside-title">
			<h2 id="signup-aside-title">{m.signup_aside_title()}</h2>
			<ul class="checklist">
				<li>{m.signup_get_outfit()}</li>
				<li>{m.signup_get_inventory()}</li>
				<li>{m.signup_get_viewer()}</li>
			</ul>
			<p class="muted">
				{m.signup_have_account()} <a href={resolve('/login')}>{m.nav_login()}</a>
			</p>
		</aside>
	</div>
{:else}
	<section class="card stack closed" aria-labelledby="signup-title">
		<h1 id="signup-title">{m.signup_title()}</h1>
		<p class="muted">{m.signup_closed({ grid: data.grid.name })}</p>
		<p><a class="button secondary" href={resolve('/login')}>{m.nav_login()}</a></p>
	</section>
{/if}

<style>
	.closed {
		max-width: var(--width-column);
		margin-inline: auto;
	}
</style>
