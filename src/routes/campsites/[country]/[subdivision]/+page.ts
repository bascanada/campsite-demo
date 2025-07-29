import { glob } from 'glob';
import { error } from '@sveltejs/kit';

export const prerender = true;

export async function load({ params }) {
    const { country, subdivision } = params;
    // Find all campsite markdown files under static/content/campsites/north-america/{country}/{subdivision}
    const files = await glob(`static/content/campsites/north-america/${country}/${subdivision}/*.md`);
    if (!files.length) error(404, 'Subdivision not found');
    // Extract campsite slugs from filenames
    const campsites = files.map(f => f.split('/').pop().replace('.md', '')).filter(Boolean);
    return { country, subdivision, campsites };
}
