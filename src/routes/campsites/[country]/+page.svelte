<script lang="ts">
    export let data: { country: string, subdivisions: string[] };
</script>

<h1>Browse Subdivisions in {data.country}</h1>
<ul>
    {#each data.subdivisions as sub}
        <li><a href="/campsites/{data.country}/{sub}">{sub}</a></li>
    {/each}
</ul>
