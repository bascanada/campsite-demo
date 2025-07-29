<script lang="ts">
import { onMount } from 'svelte';
import { page } from '$app/stores';

let campsite: any = {};
let renderedDescription = '';
let error: string | null = null;

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

onMount(async () => {
    const slug = $page.params.slug;
    const url = `/content/campsites/${slug}.md`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Campsite not found');
        }
        const text = await response.text();
        console.log(text);
        // Use front-matter library for robust parsing
        const fm = (await import('front-matter')).default;
        const parsed = fm(text);
        campsite = parsed.attributes;
        const body = parsed.body;
        const { marked } = await import('marked');
        const DOMPurify = (await import('dompurify')).default;
        const html = await Promise.resolve(marked(body));
        renderedDescription = DOMPurify.sanitize(html);
    } catch (e) {
        error = 'Could not load campsite data.';
        console.error(e);
    }
});
</script>

<svelte:head>
    <title>{campsite.name} - OpenCampsiteMap Demo</title>
    <meta name="description" content="{campsite.name} details from OpenCampsiteMap demo." />
</svelte:head>

<div style="max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #fff;">
    <a href="/" style="display: block; margin-bottom: 20px; text-decoration: none; color: #007bff;">&larr; Back to Map</a>

    {#if Object.keys(campsite).length > 0}
        <h1>{campsite.name}</h1>
        {#if campsite.latitude && campsite.longitude}
            <p><strong>Location:</strong> {campsite.latitude}, {campsite.longitude}</p>
        {/if}
        {#if campsite.continent && campsite.country && campsite.region}
            <p><strong>Region:</strong> {campsite.continent} / {campsite.country} / {campsite.region.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</p>
        {/if}

        <h2>Description</h2>
        {#if renderedDescription}
            <div class="prose" style="line-height: 1.6;" >
                {@html renderedDescription}
            </div>
        {/if}

        {#if campsite.images && campsite.images.length > 0}
            <h2>Photos</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px;">
                {#each campsite.images as imageUrl}
                    <img src={imageUrl} alt="" style="width: 150px; height: 100px; object-fit: cover; border-radius: 4px;" />
                {/each}
            </div>
        {/if}

        {#if campsite.amenities && campsite.amenities.length > 0}
            <h2>Amenities</h2>
            <ul style="list-style: none; padding: 0;">
                {#each campsite.amenities as amenity}
                    <li style="background-color: #e9ecef; border-radius: 4px; padding: 5px 10px; margin: 5px; display: inline-block;">
                        {amenity.split('-').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </li>
                {/each}
            </ul>
        {/if}

        {#if campsite.reviews && campsite.reviews.length > 0}
            <h2>Reviews</h2>
            <div style="margin-top: 20px;">
                {#each campsite.reviews as review}
                    <div style="border: 1px solid #ccc; border-radius: 8px; padding: 15px; margin-bottom: 15px; background-color: #f8f9fa;">
                        <p><strong>Author:</strong> {review.author}</p>
                        <p><strong>Date:</strong> {formatDate(review.date)}</p>
                        <p><strong>Rating:</strong> {review.rating} / 5</p>
                        <p>{review.comment}</p>
                    </div>
                {/each}
            </div>
        {/if}
    {:else}
        <p>Loading campsite...</p>
    {/if}
</div>
