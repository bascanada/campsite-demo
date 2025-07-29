import { glob } from 'glob';

export const prerender = true;

export async function load() {
    // Find all country folders under static/content/campsites/north-america/canada, etc.
    const files = await glob('static/content/campsites/north-america/*');
    // Extract country names from folder names
    const countries = files.map(f => f.split('/').pop()).filter(Boolean);
    return { countries };
}
