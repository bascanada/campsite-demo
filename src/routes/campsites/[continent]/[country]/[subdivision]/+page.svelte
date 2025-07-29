<script lang="ts">
    export let data: { continent: string, country: string, subdivision: string, campsites: string[] };
</script>

<h1>Campsites in {data.subdivision}, {data.country}, {data.continent}</h1>
<ul>
    {#each data.campsites as slug}
        <li><a href={`/campsites/${data.continent}/${data.country}/${data.subdivision}/${slug}`}>{slug}</a></li>
    {/each}
</ul>
