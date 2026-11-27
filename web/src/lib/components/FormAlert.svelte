<script lang="ts">
	import type { ErrorCode } from '#lib/account-rules.js';
	import { errorText } from '#lib/error-text.js';

	let { code }: { code?: ErrorCode } = $props();
</script>

{#if code}
	<p class="alert" tabindex="-1" data-form-alert>{errorText(code)}</p>
{/if}
