<script lang="ts">
	let { onselect }: { onselect: (emoji: string) => void } = $props();

	const emojis = [
		'📁','📂','🗂️','📋','📌','📍','🗒️','📊',
		'📚','📖','📝','📄','✏️','🔖','📰','🗞️',
		'💡','🔬','🎓','💼','🏠','🌍','🌐','🗺️',
		'🎨','🎵','🎬','🏃','🍕','✈️','🚂','🚀',
		'💰','🔧','💻','📱','🧠','👀','🔍','📷',
		'⭐','❤️','🔥','✅','🎯','💎','🌟','✨',
	];
</script>

<div class="picker">
	{#each emojis as emoji}
		<button type="button" class="opt" onclick={() => onselect(emoji)}>{emoji}</button>
	{/each}
</div>

<style>
	.picker {
		display: grid;
		grid-template-columns: repeat(8, 1fr);
		gap: 1px;
		padding: 0.3rem;
	}

	.opt {
		font-size: 1rem;
		padding: 0.2rem;
		background: none;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		line-height: 1;
		display: grid;
		place-items: center;
	}

	.opt:hover { background: var(--color-bg); }
</style>
