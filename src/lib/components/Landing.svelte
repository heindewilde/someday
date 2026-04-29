<script lang="ts">
	import {
		Github,
		ArrowRight,
		Lock,
		Database,
		Zap,
		Sparkles,
		CheckCircle,
		BookmarkPlus,
		Moon,
		Sun,
		Star
	} from 'lucide-svelte';
	import { onMount } from 'svelte';

	const GITHUB_URL = 'https://github.com/heindewilde/someday';

	let isDark = $state(false);
	onMount(() => {
		isDark = document.documentElement.dataset.theme === 'dark';
	});

	function toggleDark() {
		isDark = !isDark;
		document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
		try {
			localStorage.setItem('theme', isDark ? 'dark' : 'light');
		} catch {}
	}

	const features = [
		{
			icon: Lock,
			title: 'Private by design',
			body: 'No tracking, no ads, no profiling your reading habits. Your library is yours alone.'
		},
		{
			icon: Database,
			title: 'Your data, your rules',
			body: 'Stored in a single portable file. Export or move it any time — no lock-in, ever.'
		},
		{
			icon: Zap,
			title: 'Fast and lightweight',
			body: 'Loads instantly, no bloat, works on any connection. Reading should never feel slow.'
		},
		{
			icon: Sparkles,
			title: 'Beautifully designed',
			body: 'A distraction-free reading experience with thoughtful typography and light and dark themes.'
		},
		{
			icon: CheckCircle,
			title: 'All features you need',
			body: 'Highlights, notes, search, translation, collections. Everything a serious reader needs, nothing you don\'t.'
		},
		{
			icon: BookmarkPlus,
			title: 'Save in one click',
			body: 'A bookmarklet, an email forward, or a simple paste. Save anything in seconds without breaking your flow.'
		}
	];
</script>

<div class="landing">
	<header class="nav">
		<a href="/" class="brand" aria-label="Someday home">
			<span class="brand-mark" aria-hidden="true"></span>
			<span class="brand-text">someday</span>
		</a>

		<nav class="nav-right" aria-label="Primary">
			<button class="icon-btn" onclick={toggleDark} aria-label="Toggle theme">
				{#if isDark}
					<Sun size={16} strokeWidth={2} />
				{:else}
					<Moon size={16} strokeWidth={2} />
				{/if}
			</button>
			<a class="icon-btn" href={GITHUB_URL} target="_blank" rel="noreferrer noopener" aria-label="GitHub repository">
				<Github size={16} strokeWidth={2} />
			</a>
			<a class="btn-ghost" href="/auth">Sign in</a>
			<a class="btn-primary" href="/auth">Get started</a>
		</nav>
	</header>

	<main class="main">
		<section class="hero">
			<a class="eyebrow" href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
				<Github size={13} strokeWidth={2} />
				<span>Open source</span>
				<span class="eyebrow-sep">·</span>
				<Star size={13} strokeWidth={2} fill="currentColor" />
				<span>Star on GitHub</span>
				<ArrowRight size={13} strokeWidth={2} />
			</a>

			<h1>
				A calmer home for<br />what you'll read later.
			</h1>

			<p class="subtitle">
				Save articles, read them beautifully, and keep full control of your data.
				Someday is private by design — no tracking, no ads, just your reading.
			</p>

			<div class="cta-row">
				<a class="btn-primary-lg" href="/auth">
					<span>Get started</span>
					<ArrowRight size={15} strokeWidth={2} />
				</a>
				<a class="btn-ghost-lg" href={GITHUB_URL} target="_blank" rel="noreferrer noopener">
					<Github size={15} strokeWidth={2} />
					<span>Star on GitHub</span>
				</a>
			</div>

			<p class="hero-note">No credit card required. Free to try on the cloud.</p>
		</section>

		<section class="features" aria-label="Features">
			<div class="features-grid">
				{#each features as f}
					<article class="feature">
						<div class="feature-icon">
							<f.icon size={16} strokeWidth={2} />
						</div>
						<h3>{f.title}</h3>
						<p>{f.body}</p>
					</article>
				{/each}
			</div>
		</section>
	</main>

	<footer class="footer">
		<span class="footer-brand">someday</span>
		<span class="footer-sep">·</span>
		<span>A quiet read-it-later app.</span>
		<span class="footer-spacer"></span>
		<a href={GITHUB_URL} target="_blank" rel="noreferrer noopener">GitHub</a>
		<a href="/auth">Sign in</a>
	</footer>
</div>

<style>
	.landing {
		min-height: 100vh;
		background: var(--color-bg);
		color: var(--color-text);
		display: flex;
		flex-direction: column;
	}

	.nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.25rem 2rem;
		max-width: 1200px;
		width: 100%;
		margin: 0 auto;
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
	}

	.brand-text {
		font-size: 1.0625rem;
		font-weight: 700;
		letter-spacing: -0.04em;
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
		text-decoration: none;
		transition: background 0.15s, color 0.15s, border-color 0.15s;
	}

	.icon-btn:hover {
		background: var(--color-surface);
		border-color: var(--color-border);
		color: var(--color-text);
	}

	.btn-ghost {
		display: inline-flex;
		align-items: center;
		padding: 0.4rem 0.75rem;
		border-radius: var(--radius-md);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-muted);
		text-decoration: none;
		transition: color 0.15s, background 0.15s;
	}

	.btn-ghost:hover {
		color: var(--color-text);
		background: var(--color-surface);
	}

	.btn-primary {
		display: inline-flex;
		align-items: center;
		padding: 0.4rem 0.85rem;
		border-radius: var(--radius-md);
		background: var(--color-text);
		color: var(--color-bg);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		transition: opacity 0.15s;
	}

	.btn-primary:hover {
		opacity: 0.88;
	}

	.main {
		flex: 1;
		max-width: 1100px;
		width: 100%;
		margin: 0 auto;
		padding: 0 2rem;
	}

	.hero {
		text-align: center;
		padding: 5rem 0 4.5rem;
	}

	.eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.375rem 0.75rem;
		border-radius: 999px;
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-muted);
		font-size: 0.75rem;
		font-weight: 500;
		letter-spacing: -0.005em;
		text-decoration: none;
		transition: border-color 0.15s, color 0.15s;
	}

	.eyebrow:hover {
		border-color: var(--color-border-strong);
		color: var(--color-text);
	}

	.eyebrow-sep {
		color: var(--color-subtle);
	}

	h1 {
		margin: 1.5rem 0 1.25rem;
		font-size: clamp(2rem, 5vw, 3.375rem);
		line-height: 1.08;
		letter-spacing: -0.035em;
		font-weight: 600;
	}

	.subtitle {
		max-width: 36rem;
		margin: 0 auto;
		color: var(--color-muted);
		font-size: clamp(0.9375rem, 1.4vw, 1.0625rem);
		line-height: 1.55;
	}

	.cta-row {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.625rem;
		margin-top: 2rem;
		flex-wrap: wrap;
	}

	.btn-primary-lg,
	.btn-ghost-lg {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.625rem 1.125rem;
		border-radius: var(--radius-md);
		font-size: 0.9375rem;
		font-weight: 500;
		text-decoration: none;
		transition: opacity 0.15s, background 0.15s, border-color 0.15s;
	}

	.btn-primary-lg {
		background: var(--color-text);
		color: var(--color-bg);
		border: 1px solid var(--color-text);
	}

	.btn-primary-lg:hover {
		opacity: 0.9;
	}

	.btn-ghost-lg {
		background: var(--color-surface);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-ghost-lg:hover {
		border-color: var(--color-border-strong);
	}

	.hero-note {
		color: var(--color-subtle);
		font-size: 0.8125rem;
		margin: 1.25rem 0 0;
	}

	.features {
		padding: 1.5rem 0 5rem;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 1px;
		background: var(--color-border);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-xl);
		overflow: hidden;
	}

	.feature {
		background: var(--color-surface);
		padding: 1.5rem 1.5rem 1.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.feature-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.875rem;
		height: 1.875rem;
		border-radius: var(--radius-sm);
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		margin-bottom: 0.375rem;
	}

	.feature h3 {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 600;
		letter-spacing: -0.01em;
	}

	.feature p {
		margin: 0;
		color: var(--color-muted);
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.footer {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		max-width: 1100px;
		width: 100%;
		margin: 0 auto;
		padding: 1.5rem 2rem 2rem;
		color: var(--color-muted);
		font-size: 0.8125rem;
		border-top: 1px solid var(--color-border);
	}

	.footer-brand {
		font-weight: 700;
		letter-spacing: -0.04em;
		color: var(--color-text);
	}

	.footer-sep {
		color: var(--color-subtle);
	}

	.footer-spacer {
		flex: 1;
	}

	.footer a {
		color: var(--color-muted);
		text-decoration: none;
		margin-left: 1rem;
		transition: color 0.15s;
	}

	.footer a:hover {
		color: var(--color-text);
	}

	@media (max-width: 860px) {
		.features-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 560px) {
		.nav {
			padding: 1rem 1.25rem;
		}

		.main {
			padding: 0 1.25rem;
		}

		.hero {
			padding: 3rem 0 3.5rem;
		}

		.btn-ghost {
			display: none;
		}

		.features-grid {
			grid-template-columns: 1fr;
		}

		.footer {
			padding: 1.25rem 1.25rem 1.75rem;
			flex-wrap: wrap;
		}
	}
</style>
