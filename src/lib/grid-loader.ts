// Grid-based campsite data loader for efficient map rendering
export class GridCampsiteLoader {
  private cache: Map<string, any> = new Map();
  private currentZoom: number = 0;
  private currentBounds: any = null;
  private loadedCells: Set<string> = new Set();
  private metadata: any = null;

  constructor() {
    // Properties initialized above
  }

  async init() {
    try {
      const response = await fetch('/api/grid/meta/stats.json');
      this.metadata = await response.json();
      console.log('Grid metadata loaded:', this.metadata.stats);
    } catch (error) {
      console.error('Failed to load grid metadata:', error);
    }
  }

  // Determine appropriate zoom level based on map zoom
  getGridZoom(mapZoom: number): number {
    if (mapZoom <= 4) return 2;      // Country level
    if (mapZoom <= 7) return 4;      // Regional level  
    if (mapZoom <= 10) return 6;     // Area level
    return 8;                        // Detailed view
  }

  // Calculate which grid cells are visible in current map bounds
  getVisibleGridCells(bounds: any, gridZoom: number): string[] {
    const gridSize = this.metadata?.gridConfig[gridZoom]?.size || 45;
    const cells: string[] = [];

    const minX = Math.floor((bounds.getWest() + 180) / gridSize);
    const maxX = Math.floor((bounds.getEast() + 180) / gridSize);
    const minY = Math.floor((bounds.getSouth() + 90) / gridSize);
    const maxY = Math.floor((bounds.getNorth() + 90) / gridSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        cells.push(`${x}-${y}`);
      }
    }

    return cells;
  }

  // Load a specific grid cell
  async loadGridCell(gridZoom: number, cellKey: string): Promise<any> {
    const cacheKey = `z${gridZoom}-${cellKey}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`/api/grid/z${gridZoom}/${cellKey}.json`);
      if (!response.ok) {
        // Cell doesn't exist (no campsites in this area) - this is normal
        this.cache.set(cacheKey, null); // Cache the "empty" result
        return null;
      }

      const cellData = await response.json();
      this.cache.set(cacheKey, cellData);
      return cellData;
    } catch (error) {
      // Silently handle missing grid cells - they're expected when areas have no campsites
      this.cache.set(cacheKey, null);
      return null;
    }
  }

  // Load campsites for current map view
  async loadCampsitesForView(map: any): Promise<any> {
    if (!this.metadata) {
      await this.init();
    }

    const mapZoom = map.getZoom();
    const mapBounds = map.getBounds();
    const gridZoom = this.getGridZoom(mapZoom);

    console.log(`Grid loader: map zoom ${mapZoom} -> grid zoom ${gridZoom}`);

    // Check if we need to reload data
    const boundsChanged = !this.currentBounds || !this.currentBounds.equals(mapBounds);
    const zoomChanged = this.currentZoom !== gridZoom;

    if (!boundsChanged && !zoomChanged) {
      console.log('Using cached grid data');
      return this.getCachedCampsites(gridZoom, mapBounds);
    }

    this.currentZoom = gridZoom;
    this.currentBounds = mapBounds;

    const visibleCells = this.getVisibleGridCells(mapBounds, gridZoom);
    const newCells = visibleCells.filter(cell => 
      !this.loadedCells.has(`z${gridZoom}-${cell}`)
    );

    console.log(`Loading ${newCells.length} new grid cells out of ${visibleCells.length} visible cells for zoom ${gridZoom}`);

    // Load new cells in parallel, but limit concurrency
    const batchSize = 10;
    const cellPromises = [];
    
    for (let i = 0; i < newCells.length; i += batchSize) {
      const batch = newCells.slice(i, i + batchSize);
      const batchPromises = batch.map(cellKey => 
        this.loadGridCell(gridZoom, cellKey).then(data => ({ cellKey, data }))
      );
      cellPromises.push(...batchPromises);
    }

    const loadedCells = await Promise.all(cellPromises);
    
    // Mark cells as loaded (even if they were empty)
    newCells.forEach(cell => {
      this.loadedCells.add(`z${gridZoom}-${cell}`);
    });

    // Count successful loads
    const successfulLoads = loadedCells.filter(result => result.data !== null).length;
    console.log(`Successfully loaded ${successfulLoads} grid cells with data`);

    return this.getCachedCampsites(gridZoom, mapBounds);
  }

  // Get campsites from cache that are within bounds
  getCachedCampsites(gridZoom: number, bounds: any): any {
    const campsites: any[] = [];
    const visibleCells = this.getVisibleGridCells(bounds, gridZoom);

    visibleCells.forEach(cellKey => {
      const cacheKey = `z${gridZoom}-${cellKey}`;
      const cellData = this.cache.get(cacheKey);
      
      if (cellData && cellData.campsites) {
        // Filter campsites that are actually within map bounds
        const filteredCampsites = cellData.campsites.filter((campsite: any) => 
          bounds.contains([campsite.latitude, campsite.longitude])
        );
        campsites.push(...filteredCampsites);
      }
    });

    return {
      campsites,
      totalInView: campsites.length,
      gridZoom,
      cellsLoaded: visibleCells.length
    };
  }

  // Get country-level summary for overview map
  async getCountrySummary() {
    try {
      const response = await fetch('/api/campsites-minimal.json');
      return await response.json();
    } catch (error) {
      console.error('Failed to load country summary:', error);
      return null;
    }
  }

  // Clear cache (useful when data is updated)
  clearCache() {
    this.cache.clear();
    this.loadedCells.clear();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      cachedCells: this.cache.size,
      loadedCells: this.loadedCells.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  estimateMemoryUsage() {
    let totalSize = 0;
    this.cache.forEach(data => {
      totalSize += JSON.stringify(data).length * 2; // Rough estimate
    });
    return `${(totalSize / 1024 / 1024).toFixed(2)} MB`;
  }
}