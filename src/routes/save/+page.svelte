<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Save — Someday</title>
</svelte:head>

<div class="save-page">
	<div class="save-box">
		<div class="logo">someday</div>
		{#if data.state === 'empty'}
			<h1>Nothing to save</h1>
			<p>No URL was supplied. Open Someday and paste a link, or use the bookmarklet from an article page.</p>
		{:else}
			<h1>Couldn't save this</h1>
			<p>{data.message}</p>
		{/if}
		<div class="actions">
			<a class="btn-primary" href="/">Back to library</a>
		</div>
	</div>
</div>

<style>
	.save-page {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg);
		padding: 1rem;
	}

	.save-box {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 2.5rem;
		width: 100%;
		max-width: 400px;
		box-shadow: var(--shadow-lg);
	}

	.logo {
		font-size: 1.25rem;
		font-weight: 700;
		letter-spacing: -0.04em;
		color: var(--color-text);
		margin-bottom: 1.5rem;
	}

	h1 {
		font-size: 1.25rem;
		font-weight: 600;
		letter-spacing: -0.02em;
		margin: 0 0 0.5rem;
	}

	p {
		color: var(--color-muted);
		font-size: 0.9375rem;
		line-height: 1.5;
		margin: 0 0 1.5rem;
	}

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-primary {
		display: inline-block;
		background: var(--color-text);
		color: var(--color-bg);
		border-radius: var(--radius-md);
		padding: 0.5625rem 1rem;
		font-size: 0.9375rem;
		font-weight: 500;
		text-decoration: none;
		transition: opacity 0.15s;
	}

	.btn-primary:hover {
		opacity: 0.85;
	}
</style>
