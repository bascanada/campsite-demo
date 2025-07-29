import { glob } from 'glob';
import { error } from '@sveltejs/kit';

export const prerender = true;

export async function load({ params }) {
    const { country } = params;
    // Find all sub-division folders under static/content/campsites/north-america/{country}
    const files = await glob(`static/content/campsites/north-america/${country}/*`);
    if (!files.length) error(404, 'Country not found');
    const subdivisions = files.map(f => f.split('/').pop()).filter(Boolean);
    return { country, subdivisions };
}
