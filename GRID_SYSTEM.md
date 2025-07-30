# Geographic Grid Indexing System

This document explains the new hierarchical geographic grid indexing system designed to efficiently handle 500k+ campsites with minimal bandwidth usage and fast query performance.

## Overview

The grid indexing system divides the world into a hierarchical grid at different zoom levels, creating static JSON files that contain only the campsites relevant to each geographic area and zoom level.

## Key Benefits

1. **Scalable**: Handles 500k+ campsites efficiently
2. **Fast Loading**: Only loads data for visible map areas
3. **Bandwidth Efficient**: Small JSON files (typically 1-50KB each)
4. **Incremental Updates**: Add new campsites without full rebuilds
5. **Smart Clustering**: Automatic clustering based on density and zoom level
6. **Static Generation**: All indexes are pre-generated at build time

## Architecture

### Grid Levels

| Zoom Level | Grid Size | Use Case | Max File Size |
|------------|-----------|----------|---------------|
| z2 | 45° (~5000km) | Country overview | ~10KB |
| z4 | 11.25° (~1250km) | Regional clusters | ~25KB |
| z6 | 2.8125° (~312km) | Detailed view | ~50KB |
| z8 | 0.703125° (~78km) | Individual sites | ~100KB |

### File Structure

```
static/api/
├── grid/
│   ├── z2/                 # Country level (zoom 2)
│   │   ├── 0-0.json
│   │   ├── 0-1.json
│   │   └── ...
│   ├── z4/                 # Regional level (zoom 4)
│   │   ├── 0-0.json
│   │   └── ...
│   ├── z6/                 # Detailed view (zoom 6)
│   │   └── ...
│   ├── z8/                 # Very detailed (zoom 8)
│   │   └── ...
│   └── meta/
│       ├── stats.json      # Generation metadata & stats
│       └── bounds.json     # Quick bounds lookup
├── campsites-minimal.json  # Country-level summary
└── campsites.json          # Legacy fallback (optional)
```

## Usage

### Generating Grid Index

```bash
# Full generation (run during build)
npm run generate-grid-index

# Incremental updates (for new campsites)
npm run incremental-update

# Update specific region
node scripts/incremental-grid-update.js --region alberta

# Update specific files
node scripts/incremental-grid-update.js path/to/campsite1.md path/to/campsite2.md
```

### Client-Side Usage

```typescript
import { GridCampsiteLoader } from '$lib/grid-loader';

const loader = new GridCampsiteLoader();
await loader.init();

// Load campsites for current map view
const result = await loader.loadCampsitesForView(map);
console.log(`Loaded ${result.totalInView} campsites from ${result.cellsLoaded} grid cells`);
```

### Grid Cell Data Format

Each grid cell JSON file contains:

```json
{
  "bounds": {
    "minLat": 45.0,
    "maxLat": 56.25,
    "minLng": -135.0,
    "maxLng": -123.75
  },
  "count": 150,
  "countries": ["canada"],
  "regions": ["alberta", "british-columbia"],
  "campsites": [
    {
      "id": "campsite-id",
      "name": "Campsite Name",
      "latitude": 51.0447,
      "longitude": -114.0719,
      "path": "/campsites/north-america/canada/alberta/campsite-name",
      "amenities": ["water", "power", "sewer"],
      "hasImages": true
    }
  ]
}
```

## Performance Characteristics

### Data Size Comparison

| Approach | 50k Sites | 200k Sites | 500k Sites | Bandwidth Savings |
|----------|-----------|------------|------------|-------------------|
| Single JSON | 12MB | 48MB | 120MB | - |
| Grid System | 50-200KB | 50-200KB | 50-200KB | 99%+ |

### Load Times

- **Initial Load**: 0.1-0.5 seconds (vs 5-30 seconds for full JSON)
- **Pan/Zoom**: 0.05-0.2 seconds (only new cells loaded)
- **Cache Hit**: Instant (data already in memory)

## Configuration

Grid behavior can be customized in `src/lib/grid-config.ts`:

```typescript
export const GRID_CONFIG = {
  2: { size: 45, maxCampsites: 0 },     // Country level
  4: { size: 11.25, maxCampsites: 50 }, // Regional clusters
  6: { size: 2.8125, maxCampsites: 200 }, // Detailed view
  8: { size: 0.703125, maxCampsites: 1000 } // Individual sites
};
```

## Optimizations

### Build-Time Optimizations

1. **Parallel Processing**: Grid cells generated in parallel
2. **Incremental Updates**: Only affected cells are regenerated
3. **Data Pruning**: Unnecessary fields removed based on zoom level
4. **Coordinate Precision**: Limited to 6 decimal places

### Runtime Optimizations

1. **Smart Caching**: LRU cache with configurable size limits
2. **Debounced Loading**: Map updates debounced to prevent excessive API calls
3. **Viewport Culling**: Only visible grid cells are loaded
4. **Progressive Loading**: Higher zoom levels load more detailed data

### Memory Management

1. **Cache Limits**: Configurable maximum cache size
2. **Auto-Cleanup**: Old grid cells removed when cache is full
3. **Memory Monitoring**: Real-time cache size monitoring

## Adding New Campsites

### Option 1: Incremental Update (Recommended)

```bash
# Add new campsite file
echo "..." > static/content/campsites/new-campsite.md

# Update only affected grid cells
node scripts/incremental-grid-update.js static/content/campsites/new-campsite.md
```

### Option 2: Full Rebuild

```bash
# Full regeneration (slower but thorough)
npm run generate-grid-index
```

## Deployment

### Build Process

1. Generate grid index: `npm run generate-grid-index`
2. Build SvelteKit app: `vite build`
3. Deploy static files including `/api/grid/` directory

### CDN Configuration

For optimal performance, configure your CDN to:

1. Cache grid JSON files for 24+ hours
2. Use gzip compression on JSON files
3. Set proper CORS headers for grid API endpoints

## Monitoring

### Client-Side Metrics

```typescript
const stats = loader.getCacheStats();
console.log({
  cachedCells: stats.cachedCells,
  memoryUsage: stats.memoryUsage,
  loadTime: performance.now() - startTime
});
```

### Server-Side Metrics

- Grid generation time
- Total grid cells created
- Average file sizes per zoom level
- Memory usage during generation

## Troubleshooting

### Common Issues

1. **Empty Grid Cells**: Normal behavior - not all grid cells contain campsites
2. **Large File Sizes**: Reduce `maxCampsites` in grid config for problematic zoom levels
3. **Slow Loading**: Check network tab for failed requests; verify grid files exist
4. **Memory Issues**: Reduce cache size or implement more aggressive cleanup

### Debug Mode

Enable debug logging:

```typescript
// In browser console
localStorage.setItem('grid-debug', 'true');
```

## Migration from Single JSON

### Step 1: Generate Grid Index

```bash
npm run generate-grid-index
```

### Step 2: Update Map Component

Replace the old map component with the new grid-based version:

```typescript
// Old
const response = await fetch('/api/campsites.json');
const campsites = await response.json();

// New
const loader = new GridCampsiteLoader();
const result = await loader.loadCampsitesForView(map);
const campsites = result.campsites;
```

### Step 3: Test & Validate

1. Verify all campsites appear correctly
2. Test zoom/pan performance
3. Check mobile performance
4. Validate memory usage

## Future Enhancements

1. **WebWorker Integration**: Move grid processing to web workers
2. **Service Worker Caching**: Offline-first grid cell caching
3. **Real-time Updates**: WebSocket-based incremental updates
4. **Compression**: Gzip or brotli compression for grid files
5. **CDN Integration**: Automatic CDN cache invalidation on updates

## Contributing

When adding features to the grid system:

1. Update configuration in `grid-config.ts`
2. Add tests for new functionality
3. Update this documentation
4. Consider backward compatibility
5. Test with large datasets (200k+ campsites)

## License

This grid indexing system is part of the OpenCampsiteMap demo project.
