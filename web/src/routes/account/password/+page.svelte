<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Field from '#lib/components/Field.svelte';
	import FormAlert from '#lib/components/FormAlert.svelte';
	import { PASSWORD_MIN_LENGTH } from '#lib/account-rules.js';
	import { focusOnError } from '#lib/enhance.js';
	import { m } from '#lib/paraglide/messages.js';
	import type { PageProps } from './$types.js';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.page_title({ page: m.password_title(), grid: data.grid.name })}</title>
</svelte:head>

<div class="stack form-page">
	<p><a href={resolve('/account')}>{m.back_to_account()}</a></p>
	<div class="split">
		<section class="card stack" aria-labelledby="password-title">
			<h1 id="password-title">{m.password_title()}</h1>
			<p class="muted">{m.password_intro()}</p>
			<form class="stack" method="POST" use:enhance={focusOnError} novalidate>
				<FormAlert code={form?.error} />
				<!-- Tells password managers which account the new password belongs to. -->
				<input
					type="text"
					autocomplete="username"
					value="{data.user?.firstName} {data.user?.lastName}"
					hidden
					readonly
				/>
				<Field
					name="currentPassword"
					type="password"
					label={m.field_password_current()}
					error={form?.errors?.currentPassword}
					autocomplete="current-password"
					required
				/>
				<Field
					name="password"
					type="password"
					label={m.field_password_new()}
					hint={m.hint_password_new({ min: PASSWORD_MIN_LENGTH })}
					error={form?.errors?.password}
					autocomplete="new-password"
					required
				/>
				<Field
					name="passwordConfirm"
					type="password"
					label={m.field_password_new_confirm()}
					error={form?.errors?.passwordConfirm}
					autocomplete="new-password"
					required
				/>
				<button class="button full" type="submit">{m.password_submit()}</button>
			</form>
		</section>

		<aside class="panel stack" aria-labelledby="password-aside-title">
			<h2 id="password-aside-title">{m.password_aside_title()}</h2>
			<ul class="checklist">
				<li>{m.password_tip_length({ min: PASSWORD_MIN_LENGTH })}</li>
				<li>{m.password_tip_words()}</li>
				<li>{m.password_tip_reuse()}</li>
			</ul>
		</aside>
	</div>
</div>
