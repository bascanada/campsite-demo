<script lang="ts">
    import { onMount } from 'svelte';
    import type { PageData } from './$types';

    export let data: PageData;
    $: campsite = data.campsite;

    let renderedDescription = '';

    onMount(async () => {
        const { marked } = await import('marked');
        const DOMPurify = (await import('dompurify')).default;
        if (campsite.description) {
            renderedDescription = DOMPurify.sanitize(marked(campsite.description));
        }
    });

    // Helper to format review dates
    function formatDate(dateString: string) {
        return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
</script>

<svelte:head>
    <title>{campsite.name} - OpenCampsiteMap Demo</title>
    <meta name="description" content="{campsite.name} details from OpenCampsiteMap demo." />
</svelte:head>

<div style="max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; background-color: #fff;">
    <a href="/" style="display: block; margin-bottom: 20px; text-decoration: none; color: #007bff;">&larr; Back to Map</a>

    <h1>{campsite.name}</h1>
    <p><strong>Location:</strong> {campsite.latitude}, {campsite.longitude}</p>
    <p><strong>Region:</strong> {campsite.continent} / {campsite.country} / {campsite.region.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</p>

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
                    {amenity.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
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
</div>
