import { glob } from 'glob';

export const prerender = true;

export async function load() {
    // Find all continent folders under static/content/campsites
    const files = await glob('static/content/campsites/*');
    // Extract continent names from folder names
    const continents = files.map(f => f.split('/').pop()).filter(Boolean);
    return { continents };
}
