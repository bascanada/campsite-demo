import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';


/** @type {import('@sveltejs/kit').Config} */
import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),

    kit: {
        adapter: adapter({
            // Include content files for ISR
            includeFiles: ['content/**/*']
        }),

        prerender: {
            // Only prerender critical pages to avoid timeouts
            entries: [
                '/',
                '/api/campsites.json'
            ],
            
            // Handle missing pages gracefully (they'll be ISR'd)
            handleMissingId: 'ignore',
            handleHttpError: ({ path, referrer, message }) => {
                // Don't fail build for missing campsite pages
                if (path.startsWith('/campsites/')) {
                    return;
                }
                throw new Error(message);
            }
        }
    }
};

export default config;
