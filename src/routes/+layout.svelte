<script lang="ts">
	import '../app.css';
	import Toaster from '$lib/components/Toaster.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{@render children()}
<Toaster />
