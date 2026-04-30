<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft } from 'lucide-svelte';
	import { untrack } from 'svelte';

	let { data, form } = $props();
	let mode = $state<'login' | 'register'>(
		untrack(() => (data.canRegister ? data.initialMode : 'login'))
	);
	$effect(() => {
		if (!data.canRegister && mode === 'register') mode = 'login';
	});
</script>

<svelte:head>
	<title>{mode === 'login' ? 'Sign in' : 'Create account'} — Someday</title>
</svelte:head>

<div class="auth-page">
	<a class="back-link" href="/">
		<ArrowLeft size={14} strokeWidth={2} />
		<span>Back</span>
	</a>

	<div class="auth-box">
		<a class="auth-logo" href="/" aria-label="Someday home">
			<span class="logo-mark" aria-hidden="true"></span>
			<span class="logo-text">someday</span>
		</a>

		<h1>{mode === 'login' ? 'Welcome back' : 'Create account'}</h1>
		<p class="subtitle">
			{mode === 'login' ? 'Sign in to your library' : 'Start saving articles for later'}
		</p>

		{#if form?.error}
			<div class="error-banner">{form.error}</div>
		{/if}

		<form method="POST" action="?/{mode}" use:enhance>
			<input type="hidden" name="next" value={data.next} />
			{#if mode === 'register'}
				<div class="field">
					<label for="name">Name</label>
					<input id="name" name="name" type="text" placeholder="Your name" autocomplete="name" />
				</div>
				{#if data.multiRegion}
				<div class="field">
					<label for="region">Data region</label>
					<select id="region" name="region">
						{#each data.regions as r}
							<option value={r.value}>{r.label}</option>
						{/each}
					</select>
					<p class="field-hint">Your data is stored in this region. Cannot be changed later.</p>
				</div>
				{/if}
			{/if}
			<div class="field">
				<label for="email">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					placeholder="you@example.com"
					required
					autocomplete="email"
					value={form?.email ?? ''}
				/>
			</div>
			<div class="field">
				<label for="password">Password</label>
				<input
					id="password"
					name="password"
					type="password"
					placeholder="••••••••"
					required
					autocomplete={mode === 'login' ? 'current-password' : 'new-password'}
				/>
			</div>
			<button type="submit" class="btn-primary">
				{mode === 'login' ? 'Sign in' : 'Create account'}
			</button>
		</form>

		{#if data.canRegister}
			<p class="toggle">
				{#if mode === 'login'}
					No account? <button onclick={() => (mode = 'register')}>Create one</button>
				{:else}
					Already have an account? <button onclick={() => (mode = 'login')}>Sign in</button>
				{/if}
			</p>
		{:else}
			<p class="toggle">Registration is disabled on this instance.</p>
		{/if}
	</div>
</div>

<style>
	.auth-page {
		position: relative;
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg);
		padding: 1rem;
	}

	.back-link {
		position: absolute;
		top: 1.5rem;
		left: 1.5rem;
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		color: var(--color-muted);
		text-decoration: none;
		font-size: 0.8125rem;
		font-weight: 500;
		padding: 0.375rem 0.625rem;
		border-radius: var(--radius-md);
		transition: color 0.15s, background 0.15s;
	}

	.back-link:hover {
		color: var(--color-text);
		background: var(--color-surface);
	}

	.auth-box {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 2.5rem;
		width: 100%;
		max-width: 400px;
		box-shadow: var(--shadow-lg);
	}

	.auth-logo {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		text-decoration: none;
		color: var(--color-text);
	}

	.logo-mark {
		width: 1.125rem;
		height: 1.125rem;
		border-radius: 999px;
		background: radial-gradient(circle at 30% 30%, #fcd34d 0%, #f59e0b 55%, #b45309 100%);
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.08);
	}

	.logo-text {
		font-size: 1.0625rem;
		font-weight: 700;
		letter-spacing: -0.04em;
		color: var(--color-text);
	}

	h1 {
		font-size: 1.25rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		margin: 0 0 0.25rem;
	}

	.subtitle {
		color: var(--color-muted);
		font-size: 0.875rem;
		margin: 0 0 1.75rem;
	}

	.error-banner {
		background: var(--color-danger-bg);
		border: 1px solid var(--color-danger-border);
		color: var(--color-danger);
		border-radius: var(--radius-md);
		padding: 0.625rem 0.875rem;
		font-size: 0.875rem;
		margin-bottom: 1rem;
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
		background: var(--color-surface);
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

	select {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.5625rem 0.75rem;
		font-size: 1rem;
		font-family: inherit;
		background: var(--color-surface);
		color: var(--color-text);
		transition: border-color 0.15s;
		width: 100%;
		cursor: pointer;
	}

	select:focus {
		outline: none;
		border-color: var(--color-text);
	}

	.field-hint {
		font-size: 0.75rem;
		color: var(--color-muted);
		margin: 0.25rem 0 0;
	}

	.btn-primary {
		width: 100%;
		background: var(--color-text);
		color: #fff;
		border: none;
		border-radius: var(--radius-md);
		padding: 0.625rem 1rem;
		font-size: 0.9375rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		margin-top: 0.5rem;
		transition: opacity 0.15s;
	}

	.btn-primary:hover {
		opacity: 0.85;
	}

	.toggle {
		text-align: center;
		font-size: 0.875rem;
		color: var(--color-muted);
		margin: 1.25rem 0 0;
	}

	.toggle button {
		background: none;
		border: none;
		color: var(--color-text);
		font-weight: 500;
		cursor: pointer;
		font-family: inherit;
		font-size: inherit;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
