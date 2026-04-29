<script lang="ts">
	import { enhance } from '$app/forms';
	import { Lock, Database, Zap, Moon, Sun, ArrowLeft } from 'lucide-svelte';
	import { onMount } from 'svelte';

	let { data, form } = $props();
	let mode = $state<'login' | 'register'>('login');

	$effect(() => {
		if (!data.canRegister && mode === 'register') mode = 'login';
	});

	let selectedRegion = $state('eu');

	let isDark = $state(false);
	onMount(() => {
		isDark = document.documentElement.dataset.theme === 'dark';
	});

	function toggleDark() {
		isDark = !isDark;
		document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
		try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch {}
	}

	const trustSignals = [
		{ icon: Lock, label: 'Private by design' },
		{ icon: Database, label: 'Your data, your choice' },
		{ icon: Zap, label: 'Fast and lightweight' },
	];

	const regionButtons = [
		{ value: 'us', emoji: '🇺🇸', label: 'US' },
		{ value: 'eu', emoji: '🇪🇺', label: 'EU' },
		{ value: 'apac', emoji: '🇯🇵', label: 'APAC' },
	];
</script>

<svelte:head>
	<title>{mode === 'login' ? 'Sign in' : 'Create account'} — Someday</title>
</svelte:head>

<div class="auth-page">
	<!-- Top nav -->
	<header class="top-nav">
		<a href="/" class="brand" aria-label="Someday home">
			<span class="brand-mark" aria-hidden="true"></span>
			<span class="brand-text">someday</span>
		</a>
		<nav class="nav-right">
			<button class="icon-btn" onclick={toggleDark} aria-label="Toggle theme">
				{#if isDark}
					<Sun size={16} strokeWidth={2} />
				{:else}
					<Moon size={16} strokeWidth={2} />
				{/if}
			</button>
			<a class="back-link" href="/">
				<ArrowLeft size={14} strokeWidth={2} />
				Back
			</a>
		</nav>
	</header>

	<div class="split">
		<!-- Left brand panel (desktop only) -->
		<aside class="brand-panel">
			<div class="brand-panel-inner">
				<a href="/" class="panel-logo" aria-label="Someday home">
					<span class="brand-mark lg" aria-hidden="true"></span>
					<span class="brand-text lg">someday</span>
				</a>
				<p class="tagline">Your reading, your rules.</p>
				<ul class="trust-signals">
					{#each trustSignals as t}
						<li>
							<span class="trust-icon"><t.icon size={14} strokeWidth={2} /></span>
							<span>{t.label}</span>
						</li>
					{/each}
				</ul>
			</div>
		</aside>

		<!-- Right form panel -->
		<main class="form-panel">
			<!-- Mobile logo (hidden on desktop) -->
			<a href="/" class="mobile-logo" aria-label="Someday home">
				<span class="brand-mark" aria-hidden="true"></span>
				<span class="brand-text">someday</span>
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
						<label for="username">Username</label>
						<div class="input-prefix-wrap">
							<span class="input-prefix">@</span>
							<input
								id="username"
								name="username"
								type="text"
								placeholder="yourhandle"
								autocomplete="username"
								class="prefixed-input"
							/>
						</div>
					</div>

					{#if data.multiRegion}
						<div class="field">
							<label>Data region</label>
							<input type="hidden" name="region" value={selectedRegion} />
							<div class="region-group">
								{#each regionButtons as r}
									<button
										type="button"
										class="region-btn"
										class:active={selectedRegion === r.value}
										onclick={() => selectedRegion = r.value}
									>
										<span>{r.emoji}</span>
										<span>{r.label}</span>
									</button>
								{/each}
							</div>
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
					<div class="label-row">
						<label for="password">Password</label>
						{#if mode === 'login'}
							<a href="/auth/forgot-password" class="forgot-link">Forgot password?</a>
						{/if}
					</div>
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
		</main>
	</div>
</div>

<style>
	.auth-page {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--color-bg);
	}

	/* ── Top nav ── */
	.top-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 2rem;
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--color-text);
	}

	.brand-mark {
		width: 1.125rem;
		height: 1.125rem;
		border-radius: 999px;
		background: radial-gradient(circle at 30% 30%, #fcd34d 0%, #f59e0b 55%, #b45309 100%);
		box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.08);
		flex-shrink: 0;
	}

	.brand-mark.lg {
		width: 1.5rem;
		height: 1.5rem;
	}

	.brand-text {
		font-size: 1.0625rem;
		font-weight: 700;
		letter-spacing: -0.04em;
	}

	.brand-text.lg {
		font-size: 1.375rem;
	}

	.nav-right {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.icon-btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: var(--radius-md);
		border: 1px solid transparent;
		background: transparent;
		color: var(--color-muted);
		cursor: pointer;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.icon-btn:hover {
		background: var(--color-surface);
		border-color: var(--color-border);
		color: var(--color-text);
	}

	.back-link {
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

	/* ── Split layout ── */
	.split {
		flex: 1;
		display: flex;
	}

	/* ── Left brand panel ── */
	.brand-panel {
		width: 45%;
		background: var(--color-surface);
		border-right: 1px solid var(--color-border);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 3rem 2.5rem;
	}

	.brand-panel-inner {
		max-width: 320px;
	}

	.panel-logo {
		display: inline-flex;
		align-items: center;
		gap: 0.625rem;
		text-decoration: none;
		color: var(--color-text);
		margin-bottom: 1.75rem;
	}

	.tagline {
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.03em;
		line-height: 1.2;
		margin: 0 0 2rem;
		color: var(--color-text);
	}

	.trust-signals {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
	}

	.trust-signals li {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		font-size: 0.875rem;
		color: var(--color-muted);
	}

	.trust-icon {
		display: flex;
		align-items: center;
		color: var(--color-text);
		flex-shrink: 0;
	}

	/* ── Right form panel ── */
	.form-panel {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		padding: 3rem 2.5rem;
		max-width: 440px;
		margin: 0 auto;
		width: 100%;
	}

	.mobile-logo {
		display: none;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: var(--color-text);
		margin-bottom: 1.75rem;
	}

	h1 {
		font-size: 1.375rem;
		font-weight: 600;
		letter-spacing: -0.025em;
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

	.label-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
	}

	.forgot-link {
		font-size: 0.8125rem;
		color: var(--color-muted);
		text-decoration: none;
		transition: color 0.15s;
	}

	.forgot-link:hover {
		color: var(--color-text);
	}

	input[type='text'],
	input[type='email'],
	input[type='password'] {
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

	/* @ prefix input */
	.input-prefix-wrap {
		display: flex;
	}

	.input-prefix {
		font-size: 1rem;
		color: var(--color-muted);
		padding: 0.5625rem 0 0.5625rem 0.75rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-right: none;
		border-radius: var(--radius-md) 0 0 var(--radius-md);
		line-height: 1;
		user-select: none;
	}

	.prefixed-input {
		border-radius: 0 var(--radius-md) var(--radius-md) 0 !important;
	}

	/* Region buttons */
	.region-group {
		display: flex;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.region-btn {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.5rem 0.5rem;
		font-size: 0.875rem;
		font-family: inherit;
		font-weight: 500;
		background: var(--color-bg);
		color: var(--color-muted);
		border: none;
		border-right: 1px solid var(--color-border);
		cursor: pointer;
		transition: background 0.15s, color 0.15s;
	}

	.region-btn:last-child {
		border-right: none;
	}

	.region-btn.active {
		background: var(--color-text);
		color: var(--color-bg);
	}

	.region-btn:not(.active):hover {
		background: var(--color-surface);
		color: var(--color-text);
	}

	.field-hint {
		font-size: 0.75rem;
		color: var(--color-muted);
		margin: 0.25rem 0 0;
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

	/* Mobile */
	@media (max-width: 639px) {
		.brand-panel {
			display: none;
		}

		.mobile-logo {
			display: inline-flex;
		}

		.top-nav .brand {
			display: none;
		}

		.split {
			padding: 0 1.25rem;
		}

		.form-panel {
			padding: 1.5rem 0 3rem;
		}
	}
</style>
