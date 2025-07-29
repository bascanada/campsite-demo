<script lang="ts">
    export let data: { continent: string, country: string, subdivisions: string[] };
</script>

<h1>Browse Subdivisions in {data.country}, {data.continent}</h1>
<ul>
    {#each data.subdivisions as sub}
        <li><a href={`/campsites/${data.continent}/${data.country}/${sub}`}>{sub}</a></li>
    {/each}
</ul>
