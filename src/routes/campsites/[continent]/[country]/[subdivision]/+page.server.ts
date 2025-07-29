import { glob } from 'glob';
import { error } from '@sveltejs/kit';

export const prerender = true;

export async function load({ params }) {
    const { continent, country, subdivision } = params;
    // Find all campsite markdown files under static/content/campsites/{continent}/{country}/{subdivision}
    const basePath = `${process.cwd()}/static/content/campsites/${continent}/${country}/${subdivision}/*.md`;
    const files = await glob(basePath);
    if (!files.length) error(404, 'Subdivision not found');
    // Extract campsite slugs from filenames
    const campsites = files.map(f => f.split('/').pop().replace('.md', '')).filter(Boolean);
    return { continent, country, subdivision, campsites };
}
