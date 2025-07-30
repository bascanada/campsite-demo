import { json } from '@sveltejs/kit';
import { glob } from 'glob';
import path from 'path';
import { promises as fs } from 'fs';
import fm from 'front-matter';

// This endpoint will be prerendered (SSG) by SvelteKit during the build
export const prerender = true;

export async function GET() {
	// The path should now point to the static directory
	const files = await glob('static/content/campsites/**/*.md');

	const campsites = await Promise.all(
		files.map(async (file) => {
			const fileContent = await fs.readFile(file, 'utf-8');
			const { attributes } = fm(fileContent);
			// Adjust the slug creation to remove 'static/' from the path
			const slug = file.replace(/^static\/content\/campsites\/(.*)\.md$/, '$1');

			return {
				name: (attributes as any).name,
				latitude: (attributes as any).latitude,
				longitude: (attributes as any).longitude,
				path: `/campsites/${slug}`
			};
		})
	);

	return json(campsites);
}
