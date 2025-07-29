import { redirect } from '@sveltejs/kit';
import matter from 'gray-matter';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Type definition for a full campsite
interface Campsite {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    continent: string;
    country: string;
    region: string;
    amenities: string[];
    images: string[];
    reviews: { author: string; date: string; rating: number; comment: string; }[];
    description: string; // The markdown content from the body
    path: string; // The URL path to this campsite
}

// ISR configuration for this route
export const config = {
    isr: {
        expiration: 60, // Revalidate page in the background after 60 seconds (for testing ISR)
    }
};

/** @type {import('./$types').PageServerLoad} */

export async function load({ params }): Promise<{ campsite: Campsite }> {
    // Support both array and string for params.slug
    const slugParam = params.slug;
    const fullSlug = Array.isArray(slugParam) ? slugParam.join('/') : slugParam || '';
    const filePath = path.join(process.cwd(), 'content', 'campsites', `${fullSlug}.md`);

    try {
        const fileContent = await readFile(filePath, 'utf-8');
        const { data, content } = matter(fileContent);

        // Ensure the 'path' property in the returned data matches the URL path
        const urlPath = `/campsites/${fullSlug}`;

        const campsiteData: Campsite = {
            id: data.id,
            name: data.name,
            latitude: data.latitude,
            longitude: data.longitude,
            continent: data.continent,
            country: data.country,
            region: data.region,
            amenities: data.amenities || [],
            images: data.images || [],
            reviews: data.reviews || [],
            description: content, // The markdown body content
            path: urlPath
        };

        return {
            campsite: campsiteData
        };
    } catch (error) {
        console.error(`Could not find campsite data for path: ${filePath}`, error);
        throw redirect(303, '/'); // Redirect to homepage for demo simplicity
    }
}
