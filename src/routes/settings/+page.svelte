<script lang="ts">
	import { ArrowLeft } from 'lucide-svelte';
	import { onMount, onDestroy } from 'svelte';
	let { data } = $props();

	// svelte-ignore state_referenced_locally
	let nameValue = $state(data.user.name ?? '');
	// svelte-ignore state_referenced_locally
	let emailValue = $state(data.user.email ?? '');
	let emailPassword = $state('');
	let currentPassword = $state('');
	let newPassword = $state('');

	let importFile = $state<File | null>(null);
	let importLoading = $state(false);
	let importProgress = $state(0);
	let importTotal = $state(0);
	let importResult = $state<{ imported: number; skipped: number } | null>(null);
	let importError = $state<string | null>(null);
	let dragOver = $state(false);
	let fileInputEl = $state<HTMLInputElement | null>(null);
	let pollTimer: ReturnType<typeof setInterval> | null = null;

	let clearConfirming = $state(false);
	let clearLoading = $state(false);

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

	async function clearLibrary() {
		clearLoading = true;
		try {
			await fetch('/api/articles', { method: 'DELETE' });
			clearConfirming = false;
		} finally {
			clearLoading = false;
		}
	}

	function pickFile(f: File | null | undefined) {
		if (!f) return;
		importFile = f;
		importResult = null;
		importError = null;
	}

	function stopPolling() {
		if (pollTimer !== null) { clearInterval(pollTimer); pollTimer = null; }
	}

	async function pollStatus() {
		try {
			const res = await fetch('/api/import/readwise');
			if (!res.ok) { stopPolling(); importLoading = false; return; }
			const data = await res.json();
			if (data.total !== undefined) importTotal = data.total;
			if (data.progress !== undefined) importProgress = data.progress;
			if (data.done) {
				importResult = { imported: data.imported, skipped: data.skipped };
				importLoading = false;
				stopPolling();
			} else if (!data.active) {
				importLoading = false;
				stopPolling();
			}
		} catch { /* ignore transient errors */ }
	}

	onMount(async () => {
		const res = await fetch('/api/import/readwise');
		if (!res.ok) return;
		const data = await res.json();
		if (data.active) {
			importLoading = true;
			importTotal = data.total ?? 0;
			importProgress = data.progress ?? 0;
			pollTimer = setInterval(pollStatus, 800);
		} else if (data.done) {
			importResult = { imported: data.imported, skipped: data.skipped };
		}
	});

	onDestroy(stopPolling);

	async function importReadwise() {
		if (!importFile) return;
		importError = null;
		importResult = null;
		importProgress = 0;
		importTotal = 0;
		importLoading = true;
		try {
			const fd = new FormData();
			fd.append('file', importFile);
			const res = await fetch('/api/import/readwise', { method: 'POST', body: fd });
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message ?? 'Import failed');
			}
			const data = await res.json();
			importTotal = data.total ?? 0;
			importFile = null;
			if (fileInputEl) fileInputEl.value = '';
			pollTimer = setInterval(pollStatus, 800);
		} catch (e: any) {
			importError = e.message;
			importLoading = false;
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
			<ArrowLeft size={14} strokeWidth={1.5} />
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

		<section class="card">
			<h2>Import from Readwise</h2>
			<p class="desc">Upload your Readwise export CSV to import your library.</p>

			{#if importResult}
				<p class="import-done">
					Imported {importResult.imported} article{importResult.imported !== 1 ? 's' : ''}{importResult.skipped > 0 ? ` · ${importResult.skipped} already existed` : ''}.
				</p>
				<a href="/" class="btn" style="margin-top: 0.75rem;">Go to library</a>
			{:else}
				<!-- Hidden real file input -->
				<input
					bind:this={fileInputEl}
					type="file"
					accept=".csv"
					style="display:none"
					onchange={(e) => pickFile((e.currentTarget as HTMLInputElement).files?.[0])}
				/>

				<!-- Drop zone -->
				<div
					class="dropzone"
					class:drag-over={dragOver}
					class:has-file={importFile}
					role="button"
					tabindex="0"
					onclick={() => !importLoading && fileInputEl?.click()}
					onkeydown={(e) => e.key === 'Enter' && !importLoading && fileInputEl?.click()}
					ondragover={(e) => { e.preventDefault(); if (!importLoading) dragOver = true; }}
					ondragleave={() => dragOver = false}
					ondrop={(e) => { e.preventDefault(); dragOver = false; if (!importLoading) pickFile(e.dataTransfer?.files[0]); }}
				>
					{#if importFile}
						<span class="dz-filename">{importFile.name}</span>
						<button
							class="dz-clear"
							onclick={(e) => { e.stopPropagation(); importFile = null; if (fileInputEl) fileInputEl.value = ''; }}
							aria-label="Remove file"
						>×</button>
					{:else}
						<span class="dz-hint">Drop CSV here or <span class="dz-browse">browse</span></span>
					{/if}
				</div>

				<!-- Progress bar -->
				{#if importLoading}
					<div class="progress-wrap">
						<div
							class="progress-bar"
							style="width: {importTotal > 0 ? Math.round((importProgress / importTotal) * 100) : 0}%"
						></div>
					</div>
					<p class="progress-label">
						{#if importTotal > 0}
							{importProgress} of {importTotal} articles imported…
						{:else}
							Reading file…
						{/if}
					</p>
					<p class="leave-hint">You can safely leave this page — the import continues in the background.</p>
				{/if}

				{#if importError}
					<p class="import-error">{importError}</p>
				{/if}

				{#if importFile && !importLoading}
					<button class="btn" onclick={importReadwise}>Import</button>
				{/if}
			{/if}
		</section>

		<section class="card danger-zone">
			<h2>Clear library</h2>
			<p class="desc">Permanently delete all saved articles. This cannot be undone.</p>
			{#if clearConfirming}
				<div class="confirm-row">
					<button class="btn btn-danger" onclick={clearLibrary} disabled={clearLoading}>
						{clearLoading ? 'Deleting…' : 'Yes, delete everything'}
					</button>
					<button class="btn btn-outline" onclick={() => clearConfirming = false}>Cancel</button>
				</div>
			{:else}
				<button class="btn btn-outline btn-danger-outline" onclick={() => clearConfirming = true}>
					Clear library
				</button>
			{/if}
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
		color: var(--color-success);
		margin: 0 0 0.625rem;
	}

	.status.error { color: var(--color-danger); }

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

	.btn-danger {
		background: var(--color-danger);
		border-color: var(--color-danger);
		color: #fff;
	}

	.btn-danger-outline {
		color: var(--color-danger);
		border-color: var(--color-danger);
	}

	.confirm-row {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-top: 0.25rem;
	}

	/* Drop zone */
	.dropzone {
		border: 1.5px dashed var(--color-border);
		border-radius: var(--radius-md);
		padding: 1.25rem 1rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
		margin-bottom: 0.75rem;
		user-select: none;
		min-height: 3.5rem;
	}

	.dropzone:hover, .dropzone.drag-over {
		border-color: var(--color-text);
		background: color-mix(in srgb, var(--color-text) 4%, transparent);
	}

	.dropzone.has-file {
		border-style: solid;
		border-color: var(--color-text);
		justify-content: space-between;
	}

	.dz-hint {
		font-size: 0.8125rem;
		color: var(--color-muted);
	}

	.dz-browse {
		color: var(--color-text);
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.dz-filename {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.dz-clear {
		background: none;
		border: none;
		color: var(--color-muted);
		font-size: 1.125rem;
		line-height: 1;
		cursor: pointer;
		padding: 0 0.125rem;
		flex-shrink: 0;
	}

	.dz-clear:hover { color: var(--color-text); }

	/* Progress */
	.progress-wrap {
		height: 3px;
		background: var(--color-border);
		border-radius: 99px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-bar {
		height: 100%;
		background: var(--color-text);
		border-radius: 99px;
		transition: width 0.3s ease;
	}

	.progress-label {
		font-size: 0.8125rem;
		color: var(--color-muted);
		margin: 0 0 0.75rem;
	}

	.leave-hint {
		font-size: 0.75rem;
		color: var(--color-subtle);
		margin: -0.25rem 0 0.75rem;
	}

	.import-error {
		font-size: 0.8125rem;
		color: var(--color-danger);
		margin: 0 0 0.625rem;
	}

	.import-done {
		font-size: 0.8125rem;
		color: var(--color-success);
		margin: 0;
	}
</style>
