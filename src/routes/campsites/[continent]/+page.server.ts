import { glob } from 'glob';
import { error } from '@sveltejs/kit';

export const prerender = true;

export async function load({ params }) {
    const { continent } = params;
    // Find all country folders under static/content/campsites/{continent}
    const files = await glob(`static/content/campsites/${continent}/*`);
    if (!files.length) error(404, 'Continent not found');
    const countries = files.map(f => f.split('/').pop()).filter(Boolean);
    return { continent, countries };
}
