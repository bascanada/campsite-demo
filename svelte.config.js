import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';


/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-vercel is automatically detected by Vercel when deployed.
		adapter: adapter(),

		// ISR and prerendering for specific routes will be handled in +page.server.js files.
		// Remove or comment out any global `prerender.entries` as ISR will manage regeneration.
		prerender: {
			// entries: ['*'] // Remove or comment out this line if present
		}
	}
};

export default config;
