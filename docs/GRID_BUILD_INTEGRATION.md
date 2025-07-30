# Grid Index Build Integration

## Overview

The campsite grid indexing system is now fully integrated into the SvelteKit build process via a custom Vite plugin. This provides optimal cache efficiency and resource management for Vercel deployments.

## Architecture

### Smart Caching System
- **Content Hash**: MD5 hash of all campsite files (modification time + size + count)
- **Cache File**: `static/.grid-cache.json` stores the last build hash and metadata
- **Incremental Updates**: Only regenerates grid when campsite content changes

### Vite Plugin Integration
- **File**: `src/lib/vite-grid-plugin.js`
- **Hook**: `buildStart` - runs before SvelteKit compilation
- **Mode**: Production builds only (`apply: 'build'`)
- **Output**: 1,856 static JSON files in `static/api/grid/`

## Build Performance

### Cache Hit (No Content Changes)
```bash
npm run build
```
- ⚡ **Fast**: Uses cached grid data
- 🕐 **Time**: ~25 seconds (normal SvelteKit build)
- 📊 **Output**: Skips grid generation entirely

### Cache Miss (Content Changed)
```bash
npm run build:force  # Forces regeneration
```
- 🔄 **Regenerates**: Processes all 50,000 campsites
- 🕐 **Time**: ~45 seconds (includes grid generation)
- 📊 **Output**: Creates 1,856 grid cell files (53MB)

## Deployment Strategy

### What Gets Committed
✅ **Source Code**: All `.ts`, `.svelte`, `.js` files  
✅ **Configuration**: `package.json`, `vite.config.ts`, etc.  
❌ **Grid Data**: `static/api/grid/` (53MB) - excluded from git  
❌ **Cache File**: `static/.grid-cache.json` - excluded from git  

### Vercel Build Process
1. **Git Clone**: Source code only (~10MB)
2. **Dependencies**: `npm install`
3. **Grid Generation**: Vite plugin processes campsites
4. **SvelteKit Build**: Standard compilation
5. **Deploy**: Static files + serverless functions

## Commands

```bash
# Development (uses existing grid data)
npm run dev

# Production build (smart caching)
npm run build

# Force regeneration (clears cache)
npm run build:force

# Legacy scripts (still available)
npm run generate-grid-index     # Standalone generation
npm run generate-grid-smart     # Standalone with caching
```

## Resource Efficiency

### Build Time Optimization
- **First Build**: ~45 seconds (full generation)
- **Subsequent Builds**: ~25 seconds (cache hit)
- **Savings**: 44% faster when no content changes

### Storage Optimization
- **Repository Size**: ~10MB (no grid data committed)
- **Deploy Package**: ~60MB (includes generated grid)
- **Bandwidth**: 99% reduction from original single JSON approach

### Scalability
- **Current**: 50,000 campsites → 1,856 grid cells
- **Target**: 500,000 campsites → ~18,000 grid cells (estimated)
- **Memory**: O(n) processing, O(log n) lookup performance

## Error Handling

### Missing Grid Data (Development)
```javascript
// Grid loader gracefully handles missing files
if (!response.ok) {
  console.warn(`Grid cell not found: ${path}`);
  return { campsites: [] };
}
```

### Build Failures
```bash
# Clear cache and rebuild
npm run build:force

# Check for corrupt markdown files
find src/content -name "*.md" -exec head -1 {} \;
```

## Future Enhancements

1. **Delta Updates**: Only rebuild changed geographic regions
2. **Compression**: Gzip static grid files for smaller deploys
3. **CDN Integration**: Upload grid data to external CDN
4. **Analytics**: Track grid cell usage for optimization

This integrated approach provides the optimal balance of build performance, resource efficiency, and maintainability for the campsite mapping system.
