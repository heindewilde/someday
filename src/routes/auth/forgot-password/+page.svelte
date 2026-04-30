<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft } from 'lucide-svelte';

	let { form } = $props();
</script>

<svelte:head>
	<title>Forgot password — Someday</title>
</svelte:head>

<div class="page">
	<a class="back-link" href="/auth">
		<ArrowLeft size={14} strokeWidth={2} />
		Back to sign in
	</a>

	<div class="box">
		<h1>Reset your password</h1>

		{#if form?.sent}
			<p class="sent-msg">If that address is registered, check your inbox.</p>
		{:else}
			<p class="desc">Enter your email and we'll send you a reset link.</p>

			<form method="POST" use:enhance>
				<div class="field">
					<label for="email">Email</label>
					<input
						id="email"
						name="email"
						type="email"
						placeholder="you@example.com"
						required
						autocomplete="email"
					/>
				</div>
				<button type="submit" class="btn-primary">Send reset link</button>
			</form>
		{/if}
	</div>
</div>

<style>
	.page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: var(--color-bg);
		padding: 1.5rem;
	}

	.back-link {
		position: fixed;
		top: 1.5rem;
		left: 1.5rem;
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-muted);
		text-decoration: none;
		padding: 0.375rem 0.625rem;
		border-radius: var(--radius-md);
		transition: color 0.15s, background 0.15s;
	}

	.back-link:hover {
		color: var(--color-text);
		background: var(--color-surface);
	}

	.box {
		width: 100%;
		max-width: 380px;
	}

	h1 {
		font-size: 1.25rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		margin: 0 0 0.5rem;
	}

	.desc {
		font-size: 0.875rem;
		color: var(--color-muted);
		margin: 0 0 1.5rem;
	}

	.sent-msg {
		font-size: 0.9375rem;
		color: var(--color-text);
		margin: 0;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin-bottom: 1rem;
	}

	label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text);
	}

	input {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.5625rem 0.75rem;
		font-size: 1rem;
		font-family: inherit;
		background: var(--color-bg);
		color: var(--color-text);
		transition: border-color 0.15s;
		width: 100%;
	}

	input:focus {
		outline: none;
		border-color: var(--color-text);
	}

	input::placeholder {
		color: var(--color-subtle);
	}

	.btn-primary {
		width: 100%;
		background: var(--color-text);
		color: var(--color-bg);
		border: none;
		border-radius: var(--radius-md);
		padding: 0.625rem 1rem;
		font-size: 0.9375rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		margin-top: 0.25rem;
		transition: opacity 0.15s;
	}

	.btn-primary:hover {
		opacity: 0.85;
	}
</style>
