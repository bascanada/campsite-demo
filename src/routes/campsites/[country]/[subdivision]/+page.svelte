<script lang="ts">
    export let data: { country: string, subdivision: string, campsites: string[] };
</script>

<h1>Campsites in {data.subdivision}, {data.country}</h1>
<ul>
    {#each data.campsites as slug}
        <li><a href="/campsites/{data.country}/{data.subdivision}/{slug}">{slug}</a></li>
    {/each}
</ul>
