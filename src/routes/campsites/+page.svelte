<script lang="ts">
    export let data: { countries: string[] };
</script>

<h1>Browse Countries</h1>
<ul>
    {#each data.countries as country}
        <li><a href="/campsites/{country}">{country}</a></li>
    {/each}
</ul>
