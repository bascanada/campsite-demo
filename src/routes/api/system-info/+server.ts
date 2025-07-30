import { json } from '@sveltejs/kit';

// This endpoint provides information about the grid system
export const prerender = true;

export async function GET() {
	const systemInfo = {
		system: 'hierarchical-grid-indexing',
		version: '1.0.0',
		description: 'Efficient geographic grid indexing for large-scale campsite data',
		endpoints: {
			grid: '/api/grid/',
			metadata: '/api/grid/meta/stats.json',
			bounds: '/api/grid/meta/bounds.json',
			minimal: '/api/campsites-minimal.json'
		},
		benefits: [
			'Handles 500k+ campsites efficiently',
			'Bandwidth savings of 99%+',
			'Fast loading (0.1-0.5 seconds)',
			'Incremental updates support',
			'Smart clustering based on density'
		],
		gridLevels: {
			z2: { size: '45°', description: 'Country level (~5000km)' },
			z4: { size: '11.25°', description: 'Regional level (~1250km)' },
			z6: { size: '2.8125°', description: 'Detailed view (~312km)' },
			z8: { size: '0.703125°', description: 'Very detailed (~78km)' }
		}
	};

	return json(systemInfo);
}
