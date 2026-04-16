export type ToastType = 'error' | 'success' | 'info';

export interface Toast {
	id: string;
	message: string;
	type: ToastType;
	undoFn?: () => void;
	timeoutId?: ReturnType<typeof setTimeout>;
}

let toasts = $state<Toast[]>([]);

export function getToasts() {
	return toasts;
}

export function addToast(
	message: string,
	type: ToastType = 'info',
	opts?: { undoFn?: () => void; duration?: number }
): string {
	const id = crypto.randomUUID();
	const duration = opts?.duration ?? (opts?.undoFn ? 5500 : 3500);
	const toast: Toast = { id, message, type, undoFn: opts?.undoFn };
	toast.timeoutId = setTimeout(() => dismissToast(id), duration);
	toasts.push(toast);
	return id;
}

export function dismissToast(id: string) {
	const idx = toasts.findIndex((t) => t.id === id);
	if (idx === -1) return;
	const toast = toasts[idx];
	if (toast.timeoutId) clearTimeout(toast.timeoutId);
	toasts.splice(idx, 1);
}
