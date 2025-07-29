<script lang="ts">
    export let data: { continent: string, countries: string[] };
</script>

<h1>Browse Countries in {data.continent}</h1>
<ul>
    {#each data.countries as country}
        <li><a href={`/campsites/${data.continent}/${country}`}>{country}</a></li>
    {/each}
</ul>
