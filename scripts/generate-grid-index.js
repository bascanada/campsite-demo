#!/usr/bin/env node

import { glob } from 'glob';
import { promises as fs } from 'fs';
import path from 'path';
import fm from 'front-matter';

// Grid configuration for different zoom levels
const GRID_CONFIG = {
  2: { size: 45 },    // ~5000km grid cells (country level)
  4: { size: 11.25 }, // ~1250km grid cells (region level) 
  6: { size: 2.8125 }, // ~312km grid cells (detailed view)
  8: { size: 0.703125 } // ~78km grid cells (very detailed)
};

// Bounds for optimization
const WORLD_BOUNDS = {
  minLat: -90,
  maxLat: 90,
  minLng: -180,
  maxLng: 180
};

class GridIndexGenerator {
  constructor() {
    this.campsites = [];
    this.gridData = {};
    this.stats = {
      totalCampsites: 0,
      countryCounts: {},
      regionCounts: {},
      gridCellCounts: {}
    };
  }

  // Convert lat/lng to grid coordinates
  latLngToGrid(lat, lng, gridSize) {
    const x = Math.floor((lng + 180) / gridSize);
    const y = Math.floor((lat + 90) / gridSize);
    return { x, y };
  }

  // Convert grid coordinates to lat/lng bounds
  gridToLatLngBounds(x, y, gridSize) {
    return {
      minLat: (y * gridSize) - 90,
      maxLat: ((y + 1) * gridSize) - 90,
      minLng: (x * gridSize) - 180,
      maxLng: ((x + 1) * gridSize) - 180
    };
  }

  async loadCampsites() {
    console.log('Loading campsite data...');
    const files = await glob('static/content/campsites/**/*.md');
    console.log(`Found ${files.length} campsite files`);

    this.campsites = await Promise.all(
      files.map(async (file) => {
        try {
          const fileContent = await fs.readFile(file, 'utf-8');
          const { attributes } = fm(fileContent);
          const slug = file.replace(/^static\/content\/campsites\/(.*)\.md$/, '$1');

          const campsite = {
            id: attributes.id,
            name: attributes.name,
            latitude: parseFloat(attributes.latitude),
            longitude: parseFloat(attributes.longitude),
            continent: attributes.continent,
            country: attributes.country,
            region: attributes.region,
            path: `/campsites/${slug}`,
            amenities: attributes.amenities || [],
            images: attributes.images || []
          };

          // Validate coordinates
          if (isNaN(campsite.latitude) || isNaN(campsite.longitude)) {
            console.warn(`Invalid coordinates for ${file}`);
            return null;
          }

          return campsite;
        } catch (error) {
          console.error(`Error processing ${file}:`, error);
          return null;
        }
      })
    );

    // Filter out invalid entries
    this.campsites = this.campsites.filter(c => c !== null);
    this.stats.totalCampsites = this.campsites.length;
    console.log(`Loaded ${this.stats.totalCampsites} valid campsites`);
  }

  generateGridIndexes() {
    console.log('Generating grid indexes...');
    
    Object.entries(GRID_CONFIG).forEach(([zoom, config]) => {
      console.log(`Processing zoom level ${zoom} (grid size: ${config.size}°)`);
      
      const zoomKey = `z${zoom}`;
      this.gridData[zoomKey] = {};
      this.stats.gridCellCounts[zoomKey] = 0;

      this.campsites.forEach(campsite => {
        const { x, y } = this.latLngToGrid(
          campsite.latitude, 
          campsite.longitude, 
          config.size
        );
        
        const gridKey = `${x}-${y}`;
        
        if (!this.gridData[zoomKey][gridKey]) {
          this.gridData[zoomKey][gridKey] = {
            bounds: this.gridToLatLngBounds(x, y, config.size),
            campsites: [],
            count: 0,
            countries: new Set(),
            regions: new Set()
          };
          this.stats.gridCellCounts[zoomKey]++;
        }

        // For detailed zoom levels, include full campsite data
        // For overview levels, include minimal data
        const campsiteData = parseInt(zoom) >= 6 ? {
          id: campsite.id,
          name: campsite.name,
          latitude: campsite.latitude,
          longitude: campsite.longitude,
          path: campsite.path,
          amenities: campsite.amenities.slice(0, 3), // Limit amenities for size
          hasImages: campsite.images.length > 0
        } : {
          id: campsite.id,
          name: campsite.name,
          latitude: campsite.latitude,
          longitude: campsite.longitude,
          path: campsite.path
        };

        this.gridData[zoomKey][gridKey].campsites.push(campsiteData);
        this.gridData[zoomKey][gridKey].count++;
        this.gridData[zoomKey][gridKey].countries.add(campsite.country);
        this.gridData[zoomKey][gridKey].regions.add(campsite.region);

        // Update global stats
        this.stats.countryCounts[campsite.country] = (this.stats.countryCounts[campsite.country] || 0) + 1;
        this.stats.regionCounts[`${campsite.country}/${campsite.region}`] = 
          (this.stats.regionCounts[`${campsite.country}/${campsite.region}`] || 0) + 1;
      });

      // Convert Sets to Arrays for JSON serialization
      Object.values(this.gridData[zoomKey]).forEach(cell => {
        cell.countries = Array.from(cell.countries);
        cell.regions = Array.from(cell.regions);
      });
    });
  }

  async saveGridIndexes() {
    console.log('Saving grid indexes...');
    
    // Create directories
    await fs.mkdir('static/api/grid', { recursive: true });
    await fs.mkdir('static/api/grid/meta', { recursive: true });

    // Save each zoom level
    for (const [zoomKey, gridCells] of Object.entries(this.gridData)) {
      const zoomDir = `static/api/grid/${zoomKey}`;
      await fs.mkdir(zoomDir, { recursive: true });

      let savedCells = 0;
      for (const [gridKey, cellData] of Object.entries(gridCells)) {
        const filePath = path.join(zoomDir, `${gridKey}.json`);
        
        // Create optimized cell data
        const optimizedCell = {
          bounds: cellData.bounds,
          count: cellData.count,
          countries: cellData.countries,
          regions: cellData.regions,
          campsites: cellData.campsites
        };

        await fs.writeFile(filePath, JSON.stringify(optimizedCell));
        savedCells++;
      }
      
      console.log(`Saved ${savedCells} grid cells for zoom level ${zoomKey}`);
    }

    // Save metadata
    const metadata = {
      generated: new Date().toISOString(),
      gridConfig: GRID_CONFIG,
      stats: this.stats,
      bounds: WORLD_BOUNDS
    };

    await fs.writeFile('static/api/grid/meta/stats.json', JSON.stringify(metadata, null, 2));

    // Generate bounds index for quick lookup
    const boundsIndex = {};
    Object.entries(this.gridData).forEach(([zoomKey, gridCells]) => {
      boundsIndex[zoomKey] = {};
      Object.entries(gridCells).forEach(([gridKey, cellData]) => {
        boundsIndex[zoomKey][gridKey] = {
          bounds: cellData.bounds,
          count: cellData.count,
          countries: cellData.countries
        };
      });
    });

    await fs.writeFile('static/api/grid/meta/bounds.json', JSON.stringify(boundsIndex));
    
    console.log('Grid index generation complete!');
    console.log(`Total campsites: ${this.stats.totalCampsites}`);
    Object.entries(this.stats.gridCellCounts).forEach(([zoom, count]) => {
      console.log(`${zoom}: ${count} grid cells`);
    });
  }

  async generateMinimalIndex() {
    console.log('Generating minimal fallback index...');
    
    // Create a minimal index for overview map
    const minimalIndex = {
      meta: {
        total: this.stats.totalCampsites,
        countries: Object.keys(this.stats.countryCounts).length,
        generated: new Date().toISOString()
      },
      summary: Object.entries(this.stats.countryCounts).map(([country, count]) => ({
        country,
        count,
        // Calculate country centroid (simplified)
        centroid: this.calculateCountryCentroid(country)
      }))
    };

    await fs.writeFile('static/api/campsites-minimal.json', JSON.stringify(minimalIndex));
  }

  calculateCountryCentroid(country) {
    const countryCampsites = this.campsites.filter(c => c.country === country);
    if (countryCampsites.length === 0) return { lat: 0, lng: 0 };

    const totalLat = countryCampsites.reduce((sum, c) => sum + c.latitude, 0);
    const totalLng = countryCampsites.reduce((sum, c) => sum + c.longitude, 0);
    
    return {
      lat: totalLat / countryCampsites.length,
      lng: totalLng / countryCampsites.length
    };
  }

  async run() {
    try {
      await this.loadCampsites();
      this.generateGridIndexes();
      await this.saveGridIndexes();
      await this.generateMinimalIndex();
    } catch (error) {
      console.error('Error generating grid index:', error);
      process.exit(1);
    }
  }
}

// Run the generator
const generator = new GridIndexGenerator();
generator.run();
