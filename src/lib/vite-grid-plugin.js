import { glob } from 'glob';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import fm from 'front-matter';

// Grid configuration for different zoom levels
const GRID_CONFIG = {
  2: { size: 45 },    // ~5000km grid cells (country level)
  4: { size: 11.25 }, // ~1250km grid cells (region level) 
  6: { size: 2.8125 }, // ~312km grid cells (detailed view)
  8: { size: 0.703125 } // ~78km grid cells (very detailed)
};

class ViteGridGenerator {
  constructor() {
    this.name = 'grid-generator';
    this.campsites = [];
    this.gridData = Object.create(null); // Create object without prototype
    this.cacheFile = 'static/.grid-cache.json';
  }

  // Vite plugin interface
  apply = 'build'; // Only run during build

  async buildStart() {
    console.log('🏗️  Starting grid generation check...');
    
    if (await this.needsRegeneration()) {
      console.log('🔄 Generating grid index...');
      await this.generateGridIndexes();
      await this.saveCache();
      console.log('✅ Grid generation completed');
    } else {
      console.log('⚡ Using cached grid data');
    }
  }

  async needsRegeneration() {
    try {
      const cache = await this.loadCache();
      const currentHash = await this.calculateContentHash();
      return currentHash !== cache.contentHash;
    } catch {
      return true; // Generate if cache doesn't exist
    }
  }

  async loadCache() {
    const cacheData = await fs.readFile(this.cacheFile, 'utf8');
    return JSON.parse(cacheData);
  }

  async saveCache() {
    const contentHash = await this.calculateContentHash();
    const cache = {
      contentHash,
      lastGenerated: new Date().toISOString(),
      stats: {
        totalCampsites: this.campsites.length,
        gridCellsGenerated: Object.keys(this.gridData).length
      }
    };
    await fs.writeFile(this.cacheFile, JSON.stringify(cache, null, 2));
  }

  async calculateContentHash() {
    const contentFiles = await glob('src/content/campsites/**/*.md');
    const fileStats = await Promise.all(
      contentFiles.map(async (file) => {
        const stat = await fs.stat(file);
        return `${file}:${stat.mtime.getTime()}:${stat.size}`;
      })
    );
    
    fileStats.push(`count:${contentFiles.length}`);
    
    return crypto
      .createHash('md5')
      .update(fileStats.sort().join('|'))
      .digest('hex');
  }

  async loadCampsites() {
    console.log('📁 Loading campsites...');
    const files = await glob('src/content/campsites/**/*.md');
    
    this.campsites = [];
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const { attributes } = fm(content);
        
        if (attributes.latitude && attributes.longitude) {
          // Extract location info from path
          const pathParts = file.split('/');
          const continent = pathParts[pathParts.length - 4] || 'unknown';
          const country = pathParts[pathParts.length - 3] || 'unknown';
          const subdivision = pathParts[pathParts.length - 2] || 'unknown';
          
          this.campsites.push({
            id: attributes.id || path.basename(file, '.md'),
            name: attributes.name || 'Unnamed Campsite',
            latitude: parseFloat(attributes.latitude),
            longitude: parseFloat(attributes.longitude),
            continent,
            country,
            subdivision,
            slug: file.replace('src/content/', '').replace('.md', ''),
            // Add essential attributes only to reduce size
            type: attributes.type || 'campground',
            capacity: attributes.capacity
          });
        }
      } catch (error) {
        console.warn(`⚠️  Error processing ${file}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    console.log(`📊 Loaded ${this.campsites.length} campsites`);
  }

  getGridCell(lat, lng, zoom) {
    const gridSize = GRID_CONFIG[zoom]?.size;
    if (!gridSize) return null;
    
    const gridX = Math.floor((lng + 180) / gridSize);
    const gridY = Math.floor((lat + 90) / gridSize);
    return `${gridX}-${gridY}`;
  }

  async generateGridIndexes() {
    await this.loadCampsites();
    
    // Initialize grid data structure
    this.gridData = Object.create(null);
    Object.keys(GRID_CONFIG).forEach(zoom => {
      this.gridData[zoom] = Object.create(null);
    });

    // Process each campsite into grid cells
    for (const campsite of this.campsites) {
      for (const zoom of Object.keys(GRID_CONFIG)) {
        const cellId = this.getGridCell(campsite.latitude, campsite.longitude, parseInt(zoom));
        
        if (cellId && !this.gridData[zoom][cellId]) {
          this.gridData[zoom][cellId] = {
            bounds: this.calculateCellBounds(cellId, parseInt(zoom)),
            campsites: []
          };
        }
        
        if (cellId) {
          this.gridData[zoom][cellId].campsites.push(campsite);
        }
      }
    }

    await this.saveGridIndexes();
  }

  calculateCellBounds(cellId, zoom) {
    const [gridX, gridY] = cellId.split('-').map(Number);
    const gridSize = GRID_CONFIG[zoom]?.size;
    
    if (!gridSize) {
      throw new Error(`Invalid zoom level: ${zoom}`);
    }
    
    return {
      south: (gridY * gridSize) - 90,
      north: ((gridY + 1) * gridSize) - 90,
      west: (gridX * gridSize) - 180,
      east: ((gridX + 1) * gridSize) - 180
    };
  }

  async saveGridIndexes() {
    console.log('💾 Saving grid indexes...');
    
    let totalFiles = 0;
    
    for (const [zoom, cells] of Object.entries(this.gridData)) {
      const zoomDir = `static/api/grid/z${zoom}`;
      await fs.mkdir(zoomDir, { recursive: true });
      
      for (const [cellId, cellData] of Object.entries(cells)) {
        const filename = `${cellId}.json`;
        const filepath = path.join(zoomDir, filename);
        
        const output = {
          zoom: parseInt(zoom),
          cell: cellId,
          bounds: cellData.bounds,
          campsiteCount: cellData.campsites.length,
          campsites: cellData.campsites
        };
        
        await fs.writeFile(filepath, JSON.stringify(output, null, 2));
        totalFiles++;
      }
      
      console.log(`📄 Generated ${Object.keys(cells).length} files for zoom level ${zoom}`);
    }
    
    console.log(`✅ Total grid files generated: ${totalFiles}`);
  }
}

// Export as Vite plugin
export function gridGenerator() {
  const generator = new ViteGridGenerator();
  
  return {
    name: 'grid-generator',
    apply: 'build',
    async buildStart() {
      await generator.buildStart();
    }
  };
}
