import { glob } from 'glob';
import { error } from '@sveltejs/kit';

export const prerender = true;

export async function load({ params }) {
    const { continent, country } = params;
    // Find all subdivision folders under static/content/campsites/{continent}/{country}
    const files = await glob(`static/content/campsites/${continent}/${country}/*`);
    if (!files.length) error(404, 'Country not found');
    const subdivisions = files.map(f => f.split('/').pop()).filter(Boolean);
    return { continent, country, subdivisions };
}
