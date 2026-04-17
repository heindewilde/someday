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

		<div class="groups">
			<div class="group">
				<p class="group-label">Navigation</p>
				<dl class="shortcuts">
					<div class="row"><dt><kbd>j</kbd><kbd>k</kbd></dt><dd>Next / previous article</dd></div>
					<div class="row"><dt><kbd>↑</kbd><kbd>↓</kbd></dt><dd>Next / previous article</dd></div>
					<div class="row"><dt><kbd>1</kbd>–<kbd>4</kbd></dt><dd>Unread / Read / Favorites / Archive</dd></div>
					<div class="row"><dt><kbd>/</kbd></dt><dd>Focus search</dd></div>
					<div class="row"><dt><kbd>n</kbd></dt><dd>Focus save bar</dd></div>
					<div class="row"><dt><kbd>Esc</kbd></dt><dd>Dismiss / clear / deselect</dd></div>
				</dl>
			</div>

			<div class="group">
				<p class="group-label">Article</p>
				<dl class="shortcuts">
					<div class="row"><dt><kbd>Enter</kbd></dt><dd>Open reader view</dd></div>
					<div class="row"><dt><kbd>r</kbd></dt><dd>Toggle read / unread</dd></div>
					<div class="row"><dt><kbd>f</kbd></dt><dd>Toggle favorite</dd></div>
					<div class="row"><dt><kbd>e</kbd></dt><dd>Archive</dd></div>
					<div class="row"><dt><kbd>d</kbd></dt><dd>Delete</dd></div>
				</dl>
			</div>

			<div class="group">
				<p class="group-label">Global</p>
				<dl class="shortcuts">
					<div class="row"><dt><kbd>Cmd</kbd>+<kbd>V</kbd></dt><dd>Paste URL to save</dd></div>
					<div class="row"><dt><kbd>?</kbd></dt><dd>Show this help</dd></div>
				</dl>
			</div>
		</div>

		<p class="hint">Hover an article or navigate with j / k, then press a shortcut.</p>
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
		width: 420px;
		max-width: calc(100vw - 2rem);
		box-shadow: var(--shadow-lg);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.25rem;
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

	.groups {
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}

	.group-label {
		font-size: 0.6875rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-subtle);
		margin: 0 0 0.5rem;
	}

	.shortcuts {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin: 0;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	dt {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		min-width: 7rem;
		flex-shrink: 0;
	}

	kbd {
		font-family: var(--font-mono);
		font-size: 0.6875rem;
		background: var(--color-bg);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		padding: 0.15em 0.45em;
		color: var(--color-text);
	}

	dd {
		font-size: 0.8125rem;
		color: var(--color-muted);
		margin: 0;
	}

	.hint {
		font-size: 0.75rem;
		color: var(--color-subtle);
		margin: 1.25rem 0 0;
		border-top: 1px solid var(--color-border);
		padding-top: 0.75rem;
	}
</style>
