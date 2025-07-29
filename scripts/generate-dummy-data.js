import { v4 as uuidv4 } from 'uuid';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const NUM_ENTRIES = 50000; // Configure the number of dummy entries
const BASE_DIR = path.join(process.cwd(), 'content', 'campsites');

const REGIONS = [
    { name: 'british-columbia', latRange: [48, 60], lonRange: [-130, -115] },
    { name: 'ontario', latRange: [41, 56], lonRange: [-95, -75] },
    { name: 'quebec', latRange: [45, 60], lonRange: [-80, -60] },
    { name: 'alberta', latRange: [49, 60], lonRange: [-120, -110] },
    { name: 'nova-scotia', latRange: [43, 47], lonRange: [-66, -60] }
];

const AMENITIES = [
    "water", "fire-pit", "toilet", "picnic-table", "trash", "cell-service",
    "ATV-access", "RV-suitable", "tent-only", "dog-friendly", "fishing", "hiking"
];

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
}

function generateSlug(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// Clear existing data before generating new
console.log(`Clearing existing data in ${BASE_DIR}...`);
rmSync(BASE_DIR, { recursive: true, force: true });
mkdirSync(BASE_DIR, { recursive: true });
console.log('Existing data cleared.');

console.log(`Generating ${NUM_ENTRIES} dummy campsite entries...`);

for (let i = 0; i < NUM_ENTRIES; i++) {
    const regionData = REGIONS[Math.floor(Math.random() * REGIONS.length)];
    const campsiteName = `Dummy Campsite ${regionData.name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} ${i + 1}`;
    const uuid = uuidv4();
    const shortUuid = uuid.substring(0, 8); // Use a short part of UUID for filename
    const filename = `${generateSlug(campsiteName)}-${shortUuid}.md`;

    const latitude = getRandomArbitrary(regionData.latRange[0], regionData.latRange[1]).toFixed(6);
    const longitude = getRandomArbitrary(regionData.lonRange[0], regionData.lonRange[1]).toFixed(6);

    const selectedAmenities = [];
    const numAmenities = Math.floor(getRandomArbitrary(2, 6));
    for(let a = 0; a < numAmenities; a++) {
        selectedAmenities.push(AMENITIES[Math.floor(Math.random() * AMENITIES.length)]);
    }
    const uniqueAmenities = [...new Set(selectedAmenities)]; // Remove duplicates

    const frontMatter = {
        id: uuid,
        name: campsiteName,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        continent: "north-america",
        country: "canada",
        region: regionData.name,
        amenities: uniqueAmenities,
        images: [
            "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg", // Placeholder
        ],
        reviews: [
            {
                author: "Dummy Reviewer A",
                date: `2025-0${Math.floor(getRandomArbitrary(1, 10))}-0${Math.floor(getRandomArbitrary(1, 28))}`,
                rating: Math.floor(getRandomArbitrary(3, 6)), // 3-5 stars
                comment: "A nice, quiet dummy spot with some basic amenities."
            },
            {
                author: "Dummy Reviewer B",
                date: `2025-0${Math.floor(getRandomArbitrary(1, 10))}-0${Math.floor(getRandomArbitrary(1, 28))}`,
                rating: Math.floor(getRandomArbitrary(2, 5)), // 2-4 stars
                comment: "Found it easily. GPS was spot on for this dummy location."
            }
        ]
    };


    const markdownContent = `---\n${Object.entries(frontMatter).map(([key, value]) => {
        if (Array.isArray(value)) {
            if (key === 'reviews') {
                // Proper YAML for array of objects
                return `${key}:\n${value.map(item => {
                    return [
                        '  - author: ' + JSON.stringify(item.author),
                        '    date: ' + JSON.stringify(item.date),
                        '    rating: ' + JSON.stringify(item.rating),
                        '    comment: ' + JSON.stringify(item.comment)
                    ].join('\n');
                }).join('\n')}`;
            } else if (key === 'amenities' || key === 'images') {
                return `${key}:\n${value.map(item => `  - ${JSON.stringify(item)}`).join('\n')}`;
            }
        }
        return `${key}: ${JSON.stringify(value)}`;
    }).join('\n')}\n---\n\nThis is a **dummy description** for ${campsiteName}, generated for the proof of concept.\n\nIt provides a serene environment, perfect for demonstrating how SvelteKit can handle a large number of static pages. The coordinates are ${latitude}, ${longitude}.\n`;

    const regionPath = path.join(BASE_DIR, frontMatter.continent, frontMatter.country, frontMatter.region);
    mkdirSync(regionPath, { recursive: true });
    writeFileSync(path.join(regionPath, filename), markdownContent);
}

console.log(`Generated ${NUM_ENTRIES} campsite entries successfully.`);
