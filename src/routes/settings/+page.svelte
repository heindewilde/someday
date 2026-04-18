<script lang="ts">
	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let nameValue = $state(data.user.name ?? '');
	// svelte-ignore state_referenced_locally
	let emailValue = $state(data.user.email ?? '');
	let emailPassword = $state('');
	let currentPassword = $state('');
	let newPassword = $state('');

	type Status = { type: 'success' | 'error'; message: string } | null;
	let nameStatus = $state<Status>(null);
	let emailStatus = $state<Status>(null);
	let passwordStatus = $state<Status>(null);

	async function patch(action: string, body: Record<string, string>) {
		const res = await fetch('/api/user', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action, ...body })
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			throw new Error(err.message ?? 'Something went wrong');
		}
	}

	async function saveName() {
		nameStatus = null;
		try {
			await patch('updateName', { name: nameValue });
			nameStatus = { type: 'success', message: 'Name updated.' };
		} catch (e: any) {
			nameStatus = { type: 'error', message: e.message };
		}
	}

	async function saveEmail() {
		emailStatus = null;
		try {
			await patch('updateEmail', { email: emailValue, password: emailPassword });
			emailPassword = '';
			emailStatus = { type: 'success', message: 'Email updated.' };
		} catch (e: any) {
			emailStatus = { type: 'error', message: e.message };
		}
	}

	async function savePassword() {
		passwordStatus = null;
		if (newPassword.length < 8) {
			passwordStatus = { type: 'error', message: 'New password must be at least 8 characters.' };
			return;
		}
		try {
			await patch('updatePassword', { currentPassword, newPassword });
			currentPassword = '';
			newPassword = '';
			passwordStatus = { type: 'success', message: 'Password updated.' };
		} catch (e: any) {
			passwordStatus = { type: 'error', message: e.message };
		}
	}
</script>

<svelte:head><title>Settings — Someday</title></svelte:head>

<div class="page">
	<header class="header">
		<a href="/" class="back">
			<svg width="14" height="14" viewBox="0 0 15 15" fill="none"><path d="M8.5 3L4.5 7.5L8.5 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
			Library
		</a>
		<h1>Settings</h1>
	</header>

	<div class="sections">
		<section class="card">
			<h2>Display name</h2>
			<p class="desc">How you appear in the app.</p>
			<div class="field">
				<input type="text" bind:value={nameValue} placeholder="Your name" />
			</div>
			{#if nameStatus}
				<p class="status" class:error={nameStatus.type === 'error'}>{nameStatus.message}</p>
			{/if}
			<button class="btn" onclick={saveName}>Save name</button>
		</section>

		<section class="card">
			<h2>Email address</h2>
			<p class="desc">Confirm your password to change your email.</p>
			<div class="field">
				<label for="email">New email</label>
				<input id="email" type="email" bind:value={emailValue} />
			</div>
			<div class="field">
				<label for="email-password">Current password</label>
				<input id="email-password" type="password" bind:value={emailPassword} placeholder="••••••••" autocomplete="current-password" />
			</div>
			{#if emailStatus}
				<p class="status" class:error={emailStatus.type === 'error'}>{emailStatus.message}</p>
			{/if}
			<button class="btn" onclick={saveEmail}>Save email</button>
		</section>

		<section class="card">
			<h2>Change password</h2>
			<p class="desc">Use at least 8 characters.</p>
			<div class="field">
				<label for="current-password">Current password</label>
				<input id="current-password" type="password" bind:value={currentPassword} placeholder="••••••••" autocomplete="current-password" />
			</div>
			<div class="field">
				<label for="new-password">New password</label>
				<input id="new-password" type="password" bind:value={newPassword} placeholder="••••••••" autocomplete="new-password" />
			</div>
			{#if passwordStatus}
				<p class="status" class:error={passwordStatus.type === 'error'}>{passwordStatus.message}</p>
			{/if}
			<button class="btn" onclick={savePassword}>Save password</button>
		</section>

		<section class="card danger-zone">
			<h2>Sign out</h2>
			<p class="desc">Sign out of your account on this device.</p>
			<a href="/auth/logout" class="btn btn-outline">Sign out</a>
		</section>
	</div>
</div>

<style>
	.page {
		max-width: 520px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
	}

	.header {
		margin-bottom: 2rem;
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8125rem;
		color: var(--color-muted);
		text-decoration: none;
		margin-bottom: 0.75rem;
		transition: color 0.1s;
	}

	.back:hover { color: var(--color-text); }

	h1 {
		font-size: 1.25rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		margin: 0;
	}

	.sections {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.25rem 1.25rem 1rem;
	}

	h2 {
		font-size: 0.9375rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		margin: 0 0 0.2rem;
	}

	.desc {
		font-size: 0.8125rem;
		color: var(--color-muted);
		margin: 0 0 1rem;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin-bottom: 0.75rem;
	}

	label {
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--color-text);
	}

	input {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: 0.5rem 0.75rem;
		font-size: 1rem;
		font-family: inherit;
		background: var(--color-bg);
		color: var(--color-text);
		width: 100%;
		transition: border-color 0.15s;
	}

	input:focus { outline: none; border-color: var(--color-text); }
	input::placeholder { color: var(--color-subtle); }

	.status {
		font-size: 0.8125rem;
		color: #16a34a;
		margin: 0 0 0.625rem;
	}

	.status.error { color: #dc2626; }

	.btn {
		display: inline-flex;
		align-items: center;
		background: var(--color-text);
		color: var(--color-bg);
		border: 1px solid var(--color-text);
		border-radius: var(--radius-md);
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		text-decoration: none;
		transition: opacity 0.15s;
		margin-top: 0.25rem;
	}

	.btn:hover { opacity: 0.8; }

	.btn-outline {
		background: none;
		color: var(--color-text);
	}

	.btn-outline:hover { opacity: 0.6; }
</style>
