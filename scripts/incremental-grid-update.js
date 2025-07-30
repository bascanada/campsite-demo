#!/usr/bin/env node

import { glob } from 'glob';
import { promises as fs } from 'fs';
import path from 'path';
import fm from 'front-matter';

/**
 * Incremental Grid Index Updater
 * 
 * This script allows updating the grid index incrementally when new campsites
 * are added, avoiding the need to rebuild the entire index.
 * 
 * Usage:
 * - Update all: node scripts/incremental-grid-update.js
 * - Update specific files: node scripts/incremental-grid-update.js file1.md file2.md
 * - Update by region: node scripts/incremental-grid-update.js --region alberta
 */

class IncrementalGridUpdater {
  constructor() {
    this.gridConfig = {
      2: { size: 45 },
      4: { size: 11.25 },
      6: { size: 2.8125 },
      8: { size: 0.703125 }
    };
    this.metadata = null;
  }

  async loadMetadata() {
    try {
      const metaFile = 'static/api/grid/meta/stats.json';
      const content = await fs.readFile(metaFile, 'utf-8');
      this.metadata = JSON.parse(content);
      console.log('Loaded existing metadata');
    } catch (error) {
      console.log('No existing metadata found, will create new index');
      this.metadata = {
        generated: new Date().toISOString(),
        gridConfig: this.gridConfig,
        stats: {
          totalCampsites: 0,
          countryCounts: {},
          regionCounts: {},
          gridCellCounts: {}
        }
      };
    }
  }

  latLngToGrid(lat, lng, gridSize) {
    const x = Math.floor((lng + 180) / gridSize);
    const y = Math.floor((lat + 90) / gridSize);
    return { x, y };
  }

  gridToLatLngBounds(x, y, gridSize) {
    return {
      minLat: (y * gridSize) - 90,
      maxLat: ((y + 1) * gridSize) - 90,
      minLng: (x * gridSize) - 180,
      maxLng: ((x + 1) * gridSize) - 180
    };
  }

  async loadGridCell(zoomKey, gridKey) {
    try {
      const filePath = `static/api/grid/${zoomKey}/${gridKey}.json`;
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      // Cell doesn't exist yet
      return null;
    }
  }

  async saveGridCell(zoomKey, gridKey, cellData) {
    const zoomDir = `static/api/grid/${zoomKey}`;
    await fs.mkdir(zoomDir, { recursive: true });
    
    const filePath = path.join(zoomDir, `${gridKey}.json`);
    await fs.writeFile(filePath, JSON.stringify(cellData));
  }

  async processCampsite(campsiteFile) {
    console.log(`Processing: ${campsiteFile}`);
    
    try {
      const fileContent = await fs.readFile(campsiteFile, 'utf-8');
      const { attributes } = fm(fileContent);
      const slug = campsiteFile.replace(/^static\/content\/campsites\/(.*)\.md$/, '$1');

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
        console.warn(`Invalid coordinates for ${campsiteFile}`);
        return;
      }

      // Update stats
      this.metadata.stats.countryCounts[campsite.country] = 
        (this.metadata.stats.countryCounts[campsite.country] || 0) + 1;
      this.metadata.stats.regionCounts[`${campsite.country}/${campsite.region}`] = 
        (this.metadata.stats.regionCounts[`${campsite.country}/${campsite.region}`] || 0) + 1;
      this.metadata.stats.totalCampsites++;

      // Process each zoom level
      for (const [zoom, config] of Object.entries(this.gridConfig)) {
        const zoomKey = `z${zoom}`;
        const { x, y } = this.latLngToGrid(campsite.latitude, campsite.longitude, config.size);
        const gridKey = `${x}-${y}`;

        // Load existing cell data
        let cellData = await this.loadGridCell(zoomKey, gridKey);
        
        if (!cellData) {
          cellData = {
            bounds: this.gridToLatLngBounds(x, y, config.size),
            campsites: [],
            count: 0,
            countries: [],
            regions: []
          };
        }

        // Check if campsite already exists (for updates)
        const existingIndex = cellData.campsites.findIndex(c => c.id === campsite.id);
        
        // Create optimized campsite data based on zoom level
        const campsiteData = parseInt(zoom) >= 6 ? {
          id: campsite.id,
          name: campsite.name,
          latitude: campsite.latitude,
          longitude: campsite.longitude,
          path: campsite.path,
          amenities: campsite.amenities.slice(0, 3),
          hasImages: campsite.images.length > 0
        } : {
          id: campsite.id,
          name: campsite.name,
          latitude: campsite.latitude,
          longitude: campsite.longitude,
          path: campsite.path
        };

        if (existingIndex >= 0) {
          // Update existing campsite
          cellData.campsites[existingIndex] = campsiteData;
        } else {
          // Add new campsite
          cellData.campsites.push(campsiteData);
          cellData.count++;
        }

        // Update countries and regions
        const countries = new Set(cellData.countries);
        const regions = new Set(cellData.regions);
        countries.add(campsite.country);
        regions.add(campsite.region);
        cellData.countries = Array.from(countries);
        cellData.regions = Array.from(regions);

        // Save updated cell
        await this.saveGridCell(zoomKey, gridKey, cellData);
      }

      console.log(`✓ Updated grid cells for ${campsite.name}`);
    } catch (error) {
      console.error(`Error processing ${campsiteFile}:`, error);
    }
  }

  async removeCampsite(campsiteId) {
    console.log(`Removing campsite: ${campsiteId}`);
    
    // This would require tracking which cells contain which campsites
    // For simplicity, we'll log that a full rebuild might be needed
    console.log('Note: Removal requires full rebuild for now');
  }

  async updateMetadata() {
    this.metadata.generated = new Date().toISOString();
    
    // Update grid cell counts
    for (const zoomKey of Object.keys(this.gridConfig).map(z => `z${z}`)) {
      try {
        const files = await glob(`static/api/grid/${zoomKey}/*.json`);
        this.metadata.stats.gridCellCounts[zoomKey] = files.length;
      } catch (error) {
        this.metadata.stats.gridCellCounts[zoomKey] = 0;
      }
    }

    // Save metadata
    await fs.mkdir('static/api/grid/meta', { recursive: true });
    await fs.writeFile(
      'static/api/grid/meta/stats.json', 
      JSON.stringify(this.metadata, null, 2)
    );

    // Update minimal index
    await this.updateMinimalIndex();
  }

  async updateMinimalIndex() {
    const minimalIndex = {
      meta: {
        total: this.metadata.stats.totalCampsites,
        countries: Object.keys(this.metadata.stats.countryCounts).length,
        generated: new Date().toISOString()
      },
      summary: Object.entries(this.metadata.stats.countryCounts).map(([country, count]) => ({
        country,
        count,
        centroid: { lat: 0, lng: 0 } // Would need to calculate from actual data
      }))
    };

    await fs.writeFile('static/api/campsites-minimal.json', JSON.stringify(minimalIndex));
  }

  async run(args) {
    await this.loadMetadata();

    if (args.length === 0) {
      // Update all files
      console.log('Updating all campsite files...');
      const files = await glob('static/content/campsites/**/*.md');
      for (const file of files) {
        await this.processCampsite(file);
      }
    } else if (args[0] === '--region') {
      // Update specific region
      const region = args[1];
      console.log(`Updating region: ${region}`);
      const files = await glob(`static/content/campsites/**/${region}/*.md`);
      for (const file of files) {
        await this.processCampsite(file);
      }
    } else {
      // Update specific files
      console.log(`Updating ${args.length} specific files...`);
      for (const file of args) {
        if (file.endsWith('.md')) {
          await this.processCampsite(file);
        }
      }
    }

    await this.updateMetadata();
    console.log('Incremental update complete!');
    console.log(`Total campsites: ${this.metadata.stats.totalCampsites}`);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const updater = new IncrementalGridUpdater();
updater.run(args).catch(error => {
  console.error('Update failed:', error);
  process.exit(1);
});
