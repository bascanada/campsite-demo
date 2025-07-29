

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { CampsiteSummary } from '$lib/types';

	let mapElement: HTMLDivElement;
	let map: any;

	onMount(async () => {
		// Dynamically import Leaflet and CSS only on client
		const L = (await import('leaflet')).default;
		await import('leaflet/dist/leaflet.css');
		const iconRetinaUrl = (await import('leaflet/dist/images/marker-icon-2x.png')).default;
		const iconUrl = (await import('leaflet/dist/images/marker-icon.png')).default;
		const shadowUrl = (await import('leaflet/dist/images/marker-shadow.png')).default;
		L.Marker.prototype.options.icon = L.icon({
			iconRetinaUrl,
			iconUrl,
			shadowUrl,
			iconSize: [25, 41],
			iconAnchor: [12, 41],
			popupAnchor: [1, -34],
			tooltipAnchor: [16, -28],
			shadowSize: [41, 41]
		});

		map = L.map(mapElement).setView([54.0, -100.0], 4);
		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			maxZoom: 19,
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
		}).addTo(map);

		const response = await fetch('/api/campsites.json');
		const campsitesData: CampsiteSummary[] = await response.json();

		campsitesData.forEach(campsite => {
			if (campsite.latitude && campsite.longitude) {
				const marker = L.marker([campsite.latitude, campsite.longitude]).addTo(map);
				marker.bindPopup(`
					<b>${campsite.name}</b><br>
					<a href="${campsite.path}">View Details</a>
				`);
				marker.on('click', () => {
					window.location.href = campsite.path;
				});
			}
		});
	});

	onDestroy(() => {
		if (map) {
			map.remove();
		}
	});
</script>

<div style="height: calc(100vh - 50px); width: 100%;" bind:this={mapElement}></div>

<style>
	div {
		margin: 0;
		padding: 0;
		position: relative;
	}
</style>
