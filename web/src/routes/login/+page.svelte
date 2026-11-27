<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Field from '#lib/components/Field.svelte';
	import FormAlert from '#lib/components/FormAlert.svelte';
	import { focusOnError } from '#lib/enhance.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types.js';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.page_title({ page: m.login_title(), grid: data.grid.name })}</title>
</svelte:head>

<div class="split form-page">
	<section class="card stack" aria-labelledby="login-title">
		<h1 id="login-title">{m.login_title()}</h1>
		<p class="muted">{m.login_intro()}</p>
		<form class="stack" method="POST" use:enhance={focusOnError} novalidate>
			<FormAlert code={form?.error} />
			<Field
				name="avatarName"
				label={m.field_avatar_name()}
				hint={m.hint_avatar_name_login()}
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
				error={form?.errors?.password}
				autocomplete="current-password"
				required
			/>
			<button class="button full" type="submit">{m.login_submit()}</button>
		</form>
	</section>

	<aside class="panel stack" aria-labelledby="login-aside-title">
		<h2 id="login-aside-title">{m.login_aside_title({ grid: data.grid.name })}</h2>
		{#if data.signupEnabled}
			<p class="muted">{m.login_aside_text()}</p>
			<p><a class="button secondary" href={resolve('/signup')}>{m.nav_signup()}</a></p>
		{:else}
			<p class="muted">{m.signup_closed({ grid: data.grid.name })}</p>
		{/if}
	</aside>
</div>
