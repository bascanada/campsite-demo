

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { GridCampsiteLoader } from '$lib/grid-loader';

	let mapElement: HTMLDivElement;
	let map: any;
	let gridLoader: GridCampsiteLoader;
	let currentMarkers: any[] = [];
	let loadingIndicator = false;
	let statsDisplay = { 
		campsites: 0, 
		gridZoom: 0, 
		cellsLoaded: 0,
		loadTime: 0,
		cacheStats: ''
	};

	// Debounce function for map updates
	function debounce(func: Function, wait: number) {
		let timeout: NodeJS.Timeout;
		return function executedFunction(...args: any[]) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}

	function clearMarkers() {
		currentMarkers.forEach(marker => {
			map.removeLayer(marker);
		});
		currentMarkers = [];
	}

	async function loadCampsitesForCurrentView() {
		if (!map || loadingIndicator) return;
		
		loadingIndicator = true;
		const startTime = performance.now();
		
		try {
			if (!gridLoader) {
				gridLoader = new GridCampsiteLoader();
				await gridLoader.init();
			}

			const mapZoom = map.getZoom();
			console.log(`Loading data for zoom level: ${mapZoom}`);
			
			// Clear existing markers
			clearMarkers();
			
			// Progressive zoom levels:
			// 0-4: Country view (1 marker for Canada)
			// 5-7: Regional clusters (provinces/large regions)
			// 8-10: City/area level clusters  
			// 11+: Individual campsites
			
			if (mapZoom <= 4) {
				console.log('Loading country summary...');
				await loadCountrySummary();
			} else if (mapZoom <= 7) {
				console.log('Loading regional clusters...');
				await loadRegionalClusters();
			} else if (mapZoom <= 10) {
				console.log('Loading area clusters...');
				await loadAreaClusters();
			} else {
				console.log('Loading individual campsites...');
				await loadCampsiteMarkers();
			}
			
			const loadTime = performance.now() - startTime;
			statsDisplay.loadTime = Math.round(loadTime);
			statsDisplay.cacheStats = gridLoader.getCacheStats().memoryUsage;
			
		} catch (error) {
			console.error('Error loading campsite data:', error);
		} finally {
			loadingIndicator = false;
		}
	}

	async function loadCountrySummary() {
		console.log('Attempting to load country summary...');
		
		// For now, let's create a simple hardcoded country marker for Canada
		// since we know all our campsites are in Canada
		const canadaMarker = (window as any).L.circleMarker([56.1304, -106.3468], {
			radius: 15,
			fillColor: '#007bff',
			color: '#0056b3',
			weight: 3,
			opacity: 0.9,
			fillOpacity: 0.7
		}).addTo(map);

		canadaMarker.bindPopup(`
			<b>Canada</b><br>
			50,001 campsites<br>
			<em>Zoom in to see details</em>
		`);
		
		currentMarkers.push(canadaMarker);

		statsDisplay = {
			...statsDisplay,
			campsites: 1, // Showing 1 country marker
			gridZoom: 0,
			cellsLoaded: 1
		};
		
		console.log('Country summary loaded: 1 marker for Canada');
	}

	async function loadRegionalClusters() {
		console.log('Loading regional clusters...');
		
		// For zoom 5-7, show provincial/regional clusters
		// Use the z4 grid level which has larger cells (~1250km)
		const result = await gridLoader.loadCampsitesForView(map);
		if (!result) {
			console.log('No regional data returned');
			return;
		}

		const { campsites } = result;
		
		// Create clusters by grouping campsites in large geographic areas
		const clusters = createGeographicClusters(campsites, 2.0); // 2 degree clusters
		
		clusters.forEach(cluster => {
			const radius = Math.min(Math.max(Math.log(cluster.count) * 4, 8), 30);
			const marker = (window as any).L.circleMarker([cluster.centerLat, cluster.centerLng], {
				radius: radius,
				fillColor: '#ff7f00',
				color: '#ff5500',
				weight: 2,
				opacity: 0.8,
				fillOpacity: 0.6
			}).addTo(map);

			marker.bindPopup(`
				<b>${cluster.count} campsites</b><br>
				<em>Zoom in to see more details</em>
			`);
			
			currentMarkers.push(marker);
		});

		statsDisplay = {
			...statsDisplay,
			campsites: clusters.length,
			gridZoom: 4,
			cellsLoaded: clusters.length
		};
		
		console.log(`Regional clusters loaded: ${clusters.length} clusters`);
	}

	async function loadAreaClusters() {
		console.log('Loading area clusters...');
		
		// For zoom 8-10, show smaller area clusters
		// Use the z6 grid level which has medium cells (~312km)
		const result = await gridLoader.loadCampsitesForView(map);
		if (!result) {
			console.log('No area data returned');
			return;
		}

		const { campsites } = result;
		
		// Create smaller clusters 
		const clusters = createGeographicClusters(campsites, 0.5); // 0.5 degree clusters
		
		// If too many clusters, limit them
		const maxClusters = 100;
		const clustersToShow = clusters.slice(0, maxClusters);
		
		clustersToShow.forEach(cluster => {
			if (cluster.count === 1) {
				// Single campsite - show as regular marker
				const campsite = cluster.campsites[0];
				const marker = (window as any).L.marker([campsite.latitude, campsite.longitude]).addTo(map);
				marker.bindPopup(`
					<b>${campsite.name}</b><br>
					<a href="${campsite.path}">View Details</a>
				`);
				currentMarkers.push(marker);
			} else {
				// Multiple campsites - show as cluster
				const radius = Math.min(Math.max(Math.log(cluster.count) * 3, 6), 20);
				const marker = (window as any).L.circleMarker([cluster.centerLat, cluster.centerLng], {
					radius: radius,
					fillColor: '#28a745',
					color: '#1e7e34',
					weight: 2,
					opacity: 0.8,
					fillOpacity: 0.6
				}).addTo(map);

				marker.bindPopup(`
					<b>${cluster.count} campsites</b><br>
					<em>Zoom in to see individual sites</em>
				`);
				
				currentMarkers.push(marker);
			}
		});

		statsDisplay = {
			...statsDisplay,
			campsites: clustersToShow.length,
			gridZoom: 6,
			cellsLoaded: clustersToShow.length
		};
		
		console.log(`Area clusters loaded: ${clustersToShow.length} clusters/markers`);
	}

	// Helper function to create geographic clusters
	function createGeographicClusters(campsites: any[], clusterSize: number): any[] {
		const clusters: any[] = [];
		const clustered = new Set();

		campsites.forEach((campsite, index) => {
			if (clustered.has(index)) return;

			const cluster = {
				centerLat: campsite.latitude,
				centerLng: campsite.longitude,
				count: 1,
				campsites: [campsite]
			};

			// Find nearby campsites to cluster
			campsites.forEach((other, otherIndex) => {
				if (index !== otherIndex && !clustered.has(otherIndex)) {
					const distance = Math.sqrt(
						Math.pow(campsite.latitude - other.latitude, 2) +
						Math.pow(campsite.longitude - other.longitude, 2)
					);

					if (distance < clusterSize) {
						cluster.campsites.push(other);
						cluster.count++;
						clustered.add(otherIndex);
						
						// Update cluster center (centroid)
						cluster.centerLat = cluster.campsites.reduce((sum, c) => sum + c.latitude, 0) / cluster.count;
						cluster.centerLng = cluster.campsites.reduce((sum, c) => sum + c.longitude, 0) / cluster.count;
					}
				}
			});

			clustered.add(index);
			clusters.push(cluster);
		});

		return clusters;
	}

	async function loadCampsiteMarkers() {
		console.log('Loading individual campsite markers...');
		const result = await gridLoader.loadCampsitesForView(map);
		if (!result) {
			console.log('No grid data returned');
			return;
		}

		const { campsites, totalInView, gridZoom, cellsLoaded } = result;
		console.log(`Grid system returned ${totalInView} campsites from ${cellsLoaded} cells at zoom level ${gridZoom}`);

		// Limit the number of markers to prevent browser crash
		const maxMarkers = 1000;
		const campsitesToShow = campsites.slice(0, maxMarkers);
		
		if (campsites.length > maxMarkers) {
			console.warn(`Limiting display to ${maxMarkers} markers out of ${campsites.length} available`);
		}

		// Add individual campsite markers
		campsitesToShow.forEach((campsite: any) => {
			if (campsite.latitude && campsite.longitude) {
				const marker = (window as any).L.marker([campsite.latitude, campsite.longitude]).addTo(map);
				
				marker.bindPopup(`
					<b>${campsite.name}</b><br>
					${campsite.amenities ? `<small>${campsite.amenities.slice(0, 3).join(', ')}</small><br>` : ''}
					<a href="${campsite.path}">View Details</a>
				`);
				
				marker.on('click', () => {
					window.location.href = campsite.path;
				});
				
				currentMarkers.push(marker);
			}
		});

		statsDisplay = {
			...statsDisplay,
			campsites: campsitesToShow.length,
			gridZoom,
			cellsLoaded
		};

		console.log(`Displayed ${campsitesToShow.length} markers on map`);
	}

	const debouncedUpdate = debounce(loadCampsitesForCurrentView, 300);

	onMount(async () => {
		// Dynamically import Leaflet and CSS only on client
		const L = (await import('leaflet')).default;
		await import('leaflet/dist/leaflet.css');
		
		// Make L available globally for the functions above
		(window as any).L = L;
		
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

		// Initial load
		await loadCampsitesForCurrentView();

		// Set up event listeners for map changes
		map.on('moveend zoomend', () => {
			debouncedUpdate();
		});
	});

	onDestroy(() => {
		if (map) {
			clearMarkers();
			map.remove();
		}
	});
</script>

<div class="container">
	<!-- Stats Panel -->
	<div class="controls">
		<div class="system-info">
			<span class="system-label">Grid System Enabled</span>
		</div>
		
		<div class="stats">
			<div class="stat">
				<span class="label">Campsites:</span>
				<span class="value">{statsDisplay.campsites.toLocaleString()}</span>
			</div>
			<div class="stat">
				<span class="label">Grid Level:</span>
				<span class="value">z{statsDisplay.gridZoom}</span>
			</div>
			<div class="stat">
				<span class="label">Cells Loaded:</span>
				<span class="value">{statsDisplay.cellsLoaded}</span>
			</div>
			<div class="stat">
				<span class="label">Load Time:</span>
				<span class="value">{statsDisplay.loadTime}ms</span>
			</div>
			<div class="stat">
				<span class="label">Cache:</span>
				<span class="value">{statsDisplay.cacheStats}</span>
			</div>
			{#if loadingIndicator}
				<div class="loading">Loading...</div>
			{/if}
		</div>
	</div>

	<!-- Map -->
	<div class="map" bind:this={mapElement}></div>
</div>

<style>
	.container {
		height: 100vh;
		width: 100%;
		position: relative;
		display: flex;
		flex-direction: column;
	}

	.controls {
		background: white;
		padding: 10px 15px;
		border-bottom: 1px solid #ddd;
		display: flex;
		align-items: center;
		gap: 20px;
		z-index: 1000;
		flex-shrink: 0;
		box-shadow: 0 2px 4px rgba(0,0,0,0.1);
	}

	.system-info {
		display: flex;
		align-items: center;
	}

	.system-label {
		background: #007bff;
		color: white;
		padding: 6px 12px;
		border-radius: 4px;
		font-size: 12px;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stats {
		display: flex;
		gap: 20px;
		align-items: center;
		font-size: 13px;
		flex: 1;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}

	.label {
		color: #666;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.value {
		font-weight: 600;
		color: #333;
	}

	.loading {
		color: #007bff;
		font-weight: 600;
		animation: pulse 1s infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.5; }
	}

	.map {
		flex: 1;
		width: 100%;
	}
</style>
