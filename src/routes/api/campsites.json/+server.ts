import { json } from '@sveltejs/kit';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

// This endpoint will be prerendered (SSG) by SvelteKit during the build
export const prerender = true;

// Define a type for your campsite summary data
interface CampsiteSummary {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    path: string;
}

export async function GET(): Promise<Response> {
    const campsites: CampsiteSummary[] = [];
    const contentDir = path.join(process.cwd(), "content", "campsites");

    async function readDirRecursive(dir: string) {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await readDirRecursive(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
                const fileContent = await readFile(fullPath, 'utf-8');
                const { data } = matter(fileContent);

                // Construct the URL path based on file system path relative to 'content/campsites'
                const relativePath = path.relative(contentDir, fullPath);
                const slugPath = '/' + path.join('campsites', relativePath.replace(/\.md$/, ''));

                // Ensure essential data exists before adding to index
                if (data.id && data.name && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
                    campsites.push({
                        id: data.id,
                        name: data.name,
                        latitude: data.latitude,
                        longitude: data.longitude,
                        path: slugPath,
                    });
                } else {
                    console.warn(`Skipping malformed campsite entry: ${fullPath}`);
                }
            }
        }
    }

    try {
        await readDirRecursive(contentDir);
    } catch (error) {
        console.error("Error reading campsite data:", error);
        return json([], { status: 500 });
    }

    return json(campsites);
}
