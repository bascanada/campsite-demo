<script lang="ts">
    export let data: { continents: string[] };
</script>

<h1>Browse Continents</h1>
<ul>
    {#each data.continents as continent}
        <li><a href={`/campsites/${continent}`}>{continent}</a></li>
    {/each}
</ul>
