<script lang="ts">
	import { getToasts, dismissToast } from '$lib/toasts.svelte';
	const toasts = getToasts();
</script>

{#if toasts.length > 0}
	<div class="toaster">
		{#each toasts as toast (toast.id)}
			<div class="toast" class:toast-error={toast.type === 'error'} class:toast-success={toast.type === 'success'}>
				<span class="toast-msg">{toast.message}</span>
				{#if toast.undoFn}
					<button
						class="toast-undo"
						onclick={() => { toast.undoFn?.(); dismissToast(toast.id); }}
					>Undo</button>
				{/if}
				<button class="toast-close" onclick={() => dismissToast(toast.id)} aria-label="Dismiss">×</button>
			</div>
		{/each}
	</div>
{/if}

<style>
	.toaster {
		position: fixed;
		bottom: 4.5rem;
		right: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 9999;
		pointer-events: none;
	}

	.toast {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-lg);
		padding: 0.625rem 0.75rem;
		box-shadow: var(--shadow-lg);
		font-size: 0.875rem;
		min-width: 240px;
		max-width: 360px;
		pointer-events: all;
		animation: slide-in 0.15s ease;
	}

	@media (max-width: 768px) {
		.toaster {
			bottom: 1.25rem;
			right: 1rem;
			left: 1rem;
		}

		.toast {
			min-width: unset;
			max-width: unset;
		}
	}

	@keyframes slide-in {
		from { opacity: 0; transform: translateY(6px); }
		to { opacity: 1; transform: translateY(0); }
	}

	.toast-error {
		border-color: #fca5a5;
		background: #fef2f2;
		color: #dc2626;
	}

	.toast-success {
		border-color: #86efac;
		background: #f0fdf4;
		color: #16a34a;
	}

	.toast-msg {
		flex: 1;
		color: var(--color-text);
	}

	.toast-error .toast-msg { color: #dc2626; }
	.toast-success .toast-msg { color: #16a34a; }

	.toast-undo {
		background: var(--color-text);
		color: var(--color-bg);
		border: none;
		border-radius: var(--radius-sm);
		padding: 0.2em 0.6em;
		font-size: 0.75rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		flex-shrink: 0;
	}

	.toast-close {
		background: none;
		border: none;
		color: var(--color-subtle);
		font-size: 1rem;
		line-height: 1;
		cursor: pointer;
		padding: 0;
		flex-shrink: 0;
	}

	.toast-close:hover { color: var(--color-text); }
</style>
