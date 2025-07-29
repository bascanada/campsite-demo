// src/routes/campsites/[...slug]/+page.server.ts
import { redirect } from '@sveltejs/kit';
import matter from 'gray-matter';
import { readFile, readdir } from 'node:fs/promises'; // Import readdir
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
    const slugParam = params.slug;
    const fullSlug = Array.isArray(slugParam) ? slugParam.join('/') : slugParam || '';
    const filePath = path.join(process.cwd(), 'content', 'campsites', `${fullSlug}.md`);

    try {
        const fileContent = await readFile(filePath, 'utf-8');
        const { data, content } = matter(fileContent);

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
            description: content,
            path: urlPath
        };

        return {
            campsite: campsiteData
        };
    } catch (error) {
        console.error(`Could not find campsite data for path: ${filePath}`, error);
        throw redirect(303, '/');
    }
}

// --- CORRECTED CODE FOR PRERENDERING ---

/** @type {import('./$types').EntryGenerator} */
export async function entries() {
    // Correct type declaration for 'paths'
    const paths: { slug: string }[] = []; // Changed to string, not string[]
    const contentDir = path.join(process.cwd(), 'content', 'campsites');

    async function readDirRecursive(dir: string, currentPathSegments: string[] = []) {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await readDirRecursive(fullPath, [...currentPathSegments, entry.name]);
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
                const slugSegment = entry.name.replace(/\.md$/, '');
                // Join the segments to form a single string for the 'slug' property
                paths.push({ slug: [...currentPathSegments, slugSegment].join('/') });
            }
        }
    }

    try {
        await readDirRecursive(contentDir);
    } catch (error) {
        console.error("Error generating entries for prerendering:", error);
    }

    return paths;
}