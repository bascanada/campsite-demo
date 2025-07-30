/**
 * Grid Index Configuration
 * 
 * This file contains all configuration settings for the geographic grid indexing system.
 * Adjust these settings based on your specific needs and campsite density.
 */

export const GRID_CONFIG = {
  // Zoom level 2: Country level overview (very low zoom)
  // Large grid cells for showing country summaries
  2: { 
    size: 45,           // 45 degrees per cell (~5000km)
    maxCampsites: 0,    // Always show as aggregated
    description: 'Country level'
  },
  
  // Zoom level 4: Regional overview (low zoom) 
  // Medium grid cells for showing regional clusters
  4: { 
    size: 11.25,        // 11.25 degrees per cell (~1250km)
    maxCampsites: 50,   // Cluster if more than 50 campsites
    description: 'Regional level'
  },
  
  // Zoom level 6: Detailed view (medium zoom)
  // Smaller grid cells for detailed campsite viewing
  6: { 
    size: 2.8125,       // 2.8125 degrees per cell (~312km)
    maxCampsites: 200,  // Show individual markers up to 200
    description: 'Detailed view'
  },
  
  // Zoom level 8: Very detailed view (high zoom)
  // Very small grid cells for individual campsite details
  8: { 
    size: 0.703125,     // 0.703125 degrees per cell (~78km)
    maxCampsites: 1000, // Always show individual markers
    description: 'Very detailed'
  }
};

export const MAP_CONFIG = {
  // Default map center and zoom
  defaultCenter: [54.0, -100.0], // Canada center
  defaultZoom: 4,
  
  // Zoom level thresholds for switching grid levels
  zoomThresholds: {
    country: 3,    // Below this, show country summaries
    region: 6,     // Below this, show regional clusters  
    detailed: 9,   // Below this, show detailed view
    veryDetailed: 12 // Above this, show very detailed view
  },
  
  // Map bounds for optimization (optional)
  bounds: {
    minLat: -90,
    maxLat: 90,
    minLng: -180,
    maxLng: 180
  },
  
  // Performance settings
  performance: {
    cacheMaxSize: 100,        // Maximum number of grid cells to cache
    debounceDelay: 300,       // Milliseconds to debounce map updates
    clusterThreshold: 100,    // Minimum campsites before clustering
    maxMarkersOnMap: 1000     // Maximum individual markers to show
  }
};

export const API_CONFIG = {
  // API endpoints
  endpoints: {
    gridBase: '/api/grid',
    metadata: '/api/grid/meta/stats.json',
    bounds: '/api/grid/meta/bounds.json',
    minimal: '/api/campsites-minimal.json'
  },
  
  // File structure
  structure: {
    gridDir: 'static/api/grid',
    metaDir: 'static/api/grid/meta',
    contentDir: 'static/content/campsites'
  }
};

export const OPTIMIZATION_CONFIG = {
  // Data optimization settings
  data: {
    // Limit amenities in grid data to reduce size
    maxAmenitiesInGrid: 3,
    
    // Include images flag only (not full URLs) in lower zoom levels
    includeImageFlags: true,
    
    // Precision for coordinates (decimal places)
    coordinatePrecision: 6
  },
  
  // Build optimization
  build: {
    // Parallel processing for grid generation
    maxConcurrentFiles: 10,
    
    // Compress grid JSON files
    compressJson: false, // Set to true if you want to compress
    
    // Generate bounds index for quick lookups
    generateBoundsIndex: true
  }
};

/**
 * Get grid zoom level based on map zoom
 */
export function getGridZoomLevel(mapZoom: number): number {
  const { zoomThresholds } = MAP_CONFIG;
  
  if (mapZoom <= zoomThresholds.country) return 2;
  if (mapZoom <= zoomThresholds.region) return 4;
  if (mapZoom <= zoomThresholds.detailed) return 6;
  return 8;
}

/**
 * Check if clustering should be used based on campsite count and zoom
 */
export function shouldCluster(campsiteCount: number, gridZoom: number): boolean {
  const config = GRID_CONFIG[gridZoom as keyof typeof GRID_CONFIG];
  return config && campsiteCount > (config.maxCampsites || 0);
}

/**
 * Get recommended grid size for a custom zoom level
 */
export function getGridSize(zoomLevel: number): number {
  // Base size at zoom 0 is 180 degrees, halved for each zoom level
  return 180 / Math.pow(2, zoomLevel);
}

export default {
  GRID_CONFIG,
  MAP_CONFIG,
  API_CONFIG,
  OPTIMIZATION_CONFIG,
  getGridZoomLevel,
  shouldCluster,
  getGridSize
};
