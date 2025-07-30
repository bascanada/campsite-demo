#!/usr/bin/env node

import { glob } from 'glob';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import fm from 'front-matter';

// Import the existing grid generator
import './generate-grid-index.js';

// Configuration
const CACHE_FILE = 'static/.grid-cache.json';
const CONTENT_DIR = 'src/content/campsites';

class SmartGridGenerator {
  constructor() {
    this.contentHash = null;
    this.lastGeneratedHash = null;
  }

  async loadCache() {
    try {
      const cacheData = await fs.readFile(CACHE_FILE, 'utf8');
      const cache = JSON.parse(cacheData);
      this.lastGeneratedHash = cache.contentHash;
      return cache;
    } catch {
      return { contentHash: null, lastGenerated: null };
    }
  }

  async saveCache() {
    const cache = {
      contentHash: this.contentHash,
      lastGenerated: new Date().toISOString(),
      stats: {
        filesProcessed: await this.countContentFiles(),
        gridCellsGenerated: await this.countGridFiles()
      }
    };
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
  }

  async calculateContentHash() {
    console.log('🔍 Calculating content hash...');
    
    // Get all markdown files
    const contentFiles = await glob('src/content/campsites/**/*.md');
    
    // Create hash of all file modification times and sizes
    const fileStats = await Promise.all(
      contentFiles.map(async (file) => {
        const stat = await fs.stat(file);
        return `${file}:${stat.mtime.getTime()}:${stat.size}`;
      })
    );

    // Include count of files for structural changes
    fileStats.push(`count:${contentFiles.length}`);
    
    this.contentHash = crypto
      .createHash('md5')
      .update(fileStats.sort().join('|'))
      .digest('hex');
    
    console.log(`📊 Content hash: ${this.contentHash}`);
    return this.contentHash;
  }

  async countContentFiles() {
    const files = await glob('src/content/campsites/**/*.md');
    return files.length;
  }

  async countGridFiles() {
    try {
      const files = await glob('static/api/grid/**/*.json');
      return files.length;
    } catch {
      return 0;
    }
  }

  async needsRegeneration() {
    await this.loadCache();
    await this.calculateContentHash();
    
    const needsRegen = this.contentHash !== this.lastGeneratedHash;
    
    if (needsRegen) {
      console.log('🔄 Content has changed, regeneration needed');
      if (this.lastGeneratedHash) {
        console.log(`   Previous: ${this.lastGeneratedHash}`);
        console.log(`   Current:  ${this.contentHash}`);
      } else {
        console.log('   No previous build cache found');
      }
    } else {
      console.log('✅ Content unchanged, using existing grid data');
    }
    
    return needsRegen;
  }

  async generateIfNeeded() {
    const startTime = Date.now();
    
    if (await this.needsRegeneration()) {
      console.log('🏗️  Generating grid index...');
      
      // Dynamic import and run the original generator
      const { spawn } = await import('child_process');
      
      return new Promise((resolve, reject) => {
        const process = spawn('node', ['scripts/generate-grid-index.js'], {
          stdio: 'inherit'
        });
        
        process.on('close', async (code) => {
          if (code === 0) {
            await this.saveCache();
            const duration = ((Date.now() - startTime) / 1000).toFixed(1);
            console.log(`✅ Grid generation completed in ${duration}s`);
            
            // Show stats
            const gridFiles = await this.countGridFiles();
            console.log(`📈 Generated ${gridFiles} grid cells`);
            resolve();
          } else {
            reject(new Error(`Grid generation failed with code ${code}`));
          }
        });
      });
    } else {
      const gridFiles = await this.countGridFiles();
      console.log(`⚡ Skipping generation - using ${gridFiles} cached grid cells`);
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new SmartGridGenerator();
  generator.generateIfNeeded().catch(console.error);
}

export default SmartGridGenerator;
