// src/routes/campsites/[...slug]/+page.server.ts
import { error, redirect } from '@sveltejs/kit';
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


const modules = import.meta.glob('/content/campsites/**/*.md', { as: 'raw' });

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }): Promise<{ campsite: Campsite }> {
    const fullSlug = params.slug || '';
    const modulePath = `/content/campsites/${fullSlug}.md`;

    // 2. Check if the module exists in our map
    if (modules[modulePath]) {
        // 3. Since we used `{ as: 'raw' }`, this directly gives us the file's string content
        const fileContent = await modules[modulePath]();
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

        return { campsite: campsiteData };
    }

    // If we get here, the file doesn't exist in the glob pattern.
    throw error(404, 'Not found');
}


// --- CORRECTED CODE FOR PRERENDERING ---

/** @type {import('./$types').EntryGenerator} */
export async function entries() {
    // Correct type declaration for 'paths'
    const paths: { slug: string }[] = []; // Changed to string, not string[]
    const contentDir = path.join(process.cwd(), 'src', 'content', 'campsites');

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