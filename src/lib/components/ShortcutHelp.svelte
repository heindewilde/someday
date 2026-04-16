<script lang="ts">
	let { onclose }: { onclose: () => void } = $props();
</script>

<div
	class="backdrop"
	onclick={onclose}
	onkeydown={(e) => e.key === 'Escape' && onclose()}
	role="presentation"
>
	<div
		class="modal"
		onclick={(e) => e.stopPropagation()}
		role="dialog"
		aria-modal="true"
		aria-label="Keyboard shortcuts"
	>
		<div class="modal-header">
			<h2>Keyboard shortcuts</h2>
			<button class="close-btn" onclick={onclose} aria-label="Close">×</button>
		</div>
		<dl class="shortcuts">
			<div class="row"><dt><kbd>r</kbd></dt><dd>Toggle read / unread</dd></div>
			<div class="row"><dt><kbd>f</kbd></dt><dd>Toggle favorite</dd></div>
			<div class="row"><dt><kbd>e</kbd></dt><dd>Archive</dd></div>
			<div class="row"><dt><kbd>Del</kbd></dt><dd>Delete</dd></div>
			<div class="row"><dt><kbd>?</kbd></dt><dd>Show this help</dd></div>
			<div class="row"><dt><kbd>Cmd+V</kbd></dt><dd>Paste URL to save</dd></div>
		</dl>
		<p class="hint">Hover over an article, then press a shortcut.</p>
	</div>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgb(0 0 0 / 0.4);
		display: grid;
		place-items: center;
		z-index: 9998;
	}

	.modal {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		padding: 1.5rem;
		min-width: 300px;
		box-shadow: var(--shadow-lg);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	h2 {
		font-size: 0.9375rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		margin: 0;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.25rem;
		line-height: 1;
		color: var(--color-subtle);
		cursor: pointer;
		padding: 0;
	}

	.close-btn:hover { color: var(--color-text); }

	.shortcuts {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 0;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	dt {
		min-width: 4rem;
	}

	kbd {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		padding: 0.15em 0.45em;
		color: var(--color-text);
	}

	dd {
		font-size: 0.875rem;
		color: var(--color-muted);
		margin: 0;
	}

	.hint {
		font-size: 0.75rem;
		color: var(--color-subtle);
		margin: 1rem 0 0;
		border-top: 1px solid var(--color-border);
		padding-top: 0.75rem;
	}
</style>
