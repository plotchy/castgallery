# Cast Gallery Architecture

## Overview

Cast Gallery is a high-performance, scalable web application for exploring and filtering social media posts (casts) from Farcaster. The architecture is designed to start simple with a ~20MB dataset and scale seamlessly to handle gigabytes of data without major rewrites.

## Core Principles

1. **Start Simple**: Begin with in-memory data storage for sub-millisecond query performance
2. **Scale Gradually**: Use the Repository Pattern to swap data layers as you grow
3. **Minimize Rework**: Keep the same API and frontend code regardless of data size
4. **Focus on UX**: Prioritize instant search and smooth filtering over complex infrastructure

## Tech Stack

### Frontend
- **Framework**: Next.js with React
- **Styling**: Tailwind CSS
- **Data Fetching**: SWR or React Query
- **Search**: Debounced inputs with real-time filtering
- **Performance**: Virtual scrolling for large result sets

### Backend
- **API**: Next.js API Routes (stays consistent across all scales)
- **Initial Data Layer**: In-memory JavaScript objects
- **Growth Data Layers**: SQLite → PostgreSQL → ClickHouse
- **Caching**: Redis (optional, added as needed)

## Architecture Phases by Data Size

### Phase 1: Small Scale (23MB - 100MB)

```
┌─────────────────┐
│   Next.js App   │
│  Frontend + API │
├─────────────────┤
│   In-Memory     │
│   Data Store    │
│  (23MB loaded)  │
└─────────────────┘
```

**Hosting**: Single $6/month DigitalOcean droplet
**Performance**: <1ms query time
**Setup**: Just `npm install && npm run build && npm start`

### Phase 2: Medium Scale (100MB - 500MB)

```
┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  Redis Cache    │
│  Frontend + API │     │   (Optional)    │
├─────────────────┤     └─────────────────┘
│  Optimized      │
│  In-Memory DB   │
│ (Lazy loading)  │
└─────────────────┘
```

**Changes**: Add caching layer, optimize memory usage
**Hosting**: Same infrastructure, maybe upgrade to $12/month droplet

### Phase 3: Large Scale (500MB - 5GB)

```
┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│     SQLite      │
│  Frontend + API │     │   Database      │
└─────────────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Memory Cache   │
│  (Hot data)     │
└─────────────────┘
```

**Changes**: Switch to SQLite, keep hot data in memory
**Hosting**: $24/month droplet with SSD storage

### Phase 4: Extra Large Scale (5GB+)

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│   API Server    │────▶│  PostgreSQL/    │
│   (Frontend)    │     │   (Backend)     │     │  ClickHouse     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │     Redis       │
                        │    Cache        │
                        └─────────────────┘
```

**Changes**: Separate frontend/backend, use production database
**Hosting**: $160-240/month for full infrastructure

## Repository Pattern Implementation

The key to seamless scaling is the Repository Pattern. Here's the structure:

```javascript
// data/repository.js - Base interface
export class CastRepository {
  async search(filters) { throw new Error('Not implemented'); }
  async getStats() { throw new Error('Not implemented'); }
  async getFacets(filters) { throw new Error('Not implemented'); }
}

// data/index.js - Factory
export function createRepository() {
  const dataSize = process.env.DATA_SIZE || 'small';
  
  switch(dataSize) {
    case 'small':
      return new InMemoryRepository();
    case 'medium':
      return new OptimizedInMemoryRepository();
    case 'large':
      return new SQLiteRepository();
    case 'xlarge':
      return new PostgreSQLRepository();
  }
}

// Your API always uses the same interface
const repository = createRepository();
const results = await repository.search(filters);
```

## Deployment Guide

### Local Development

```bash
# Clone repository
git clone https://github.com/plotchy/castgallery.git
cd castgallery

# Install dependencies
npm install

# Add your data file
cp /path/to/casts.json data/

# Run development server
npm run dev
```

### Production Deployment - Single VPS

```bash
# 1. Create DigitalOcean droplet (Ubuntu 22.04, $6-12/month)

# 2. SSH into server
ssh root@your-server-ip

# 3. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 4. Install PM2
npm install -g pm2

# 5. Clone and setup app
git clone https://github.com/plotchy/castgallery.git
cd castgallery
npm install
npm run build

# 6. Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 7. Setup Nginx (optional, for SSL)
sudo apt install nginx
sudo nano /etc/nginx/sites-available/castgallery
# Add configuration (see below)
sudo ln -s /etc/nginx/sites-available/castgallery /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name castgallery.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'castgallery',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DATA_SIZE: 'small' // Change as you scale
    }
  }]
}
```

## Performance Optimization

### In-Memory Optimizations

```javascript
class InMemoryRepository {
  constructor() {
    this.casts = [];
    this.indices = {
      byAuthor: new Map(),
      byWordCount: new Map(),
      byEmoji: new Map()
    };
    this.cache = new LRU({ max: 1000 }); // LRU cache for queries
  }

  buildIndices() {
    // Pre-calculate everything for instant queries
    this.casts.forEach((cast, index) => {
      // Author index
      if (!this.indices.byAuthor.has(cast.author)) {
        this.indices.byAuthor.set(cast.author, []);
      }
      this.indices.byAuthor.get(cast.author).push(index);
      
      // Word count buckets for range queries
      const bucket = Math.floor(cast.wordCount / 10);
      if (!this.indices.byWordCount.has(bucket)) {
        this.indices.byWordCount.set(bucket, []);
      }
      this.indices.byWordCount.get(bucket).push(index);
    });
  }
}
```

### Frontend Optimizations

```javascript
// Debounced search
const debouncedSearch = useMemo(
  () => debounce((value) => {
    setSearchTerm(value);
  }, 150),
  []
);

// Virtual scrolling for large lists
import { FixedSizeList } from 'react-window';

// Optimistic UI updates
const optimisticUpdate = (newFilters) => {
  // Update UI immediately
  setFilters(newFilters);
  // Then fetch real data
  fetchData(newFilters);
};
```

## Monitoring and Metrics

### Key Metrics to Track

```javascript
// Add to your repository
async search(filters) {
  const start = Date.now();
  const results = await this._search(filters);
  
  // Log slow queries
  const duration = Date.now() - start;
  if (duration > 100) {
    console.warn('Slow query:', { filters, duration });
  }
  
  // Track metrics
  metrics.histogram('search.duration', duration);
  metrics.increment('search.count');
  
  return results;
}
```

### Health Checks

```javascript
// pages/api/health.js
export default async function handler(req, res) {
  const checks = {
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    dataLoaded: repository.isInitialized(),
    cacheStats: repository.getCacheStats()
  };
  
  res.status(200).json({ status: 'healthy', checks });
}
```

## Migration Checklist

When growing from one phase to the next:

- [ ] Implement new repository class
- [ ] Test with subset of data
- [ ] Add feature flag for gradual rollout
- [ ] Monitor performance metrics
- [ ] Set up data migration script
- [ ] Test rollback procedure
- [ ] Update environment configuration
- [ ] Deploy and monitor

## Cost Breakdown

| Data Size | Infrastructure | Monthly Cost | Query Performance |
|-----------|---------------|--------------|-------------------|
| 23MB-100MB | Single droplet | $6 | <1ms |
| 100MB-500MB | Droplet + Redis | $12-18 | <5ms |
| 500MB-5GB | Droplet + SSD | $24-48 | <20ms |
| 5GB-50GB | Separate DB server | $80-160 | <50ms |
| 50GB+ | Full infrastructure | $240+ | <100ms |

## Security Considerations

1. **API Rate Limiting**: Implement rate limiting to prevent abuse
2. **Input Validation**: Sanitize all search inputs
3. **CORS**: Configure appropriate CORS policies
4. **SSL**: Use Let's Encrypt for free SSL certificates
5. **Environment Variables**: Never commit secrets to git

## Future Enhancements

1. **WebSocket Support**: Real-time updates for new casts
2. **Elasticsearch Integration**: Advanced full-text search
3. **GraphQL API**: More flexible querying
4. **Analytics Dashboard**: Track usage patterns
5. **Export Functionality**: Allow users to export filtered results

## Conclusion

This architecture provides a smooth path from prototype to production. Start simple with in-memory storage, focus on building an excellent user experience, and scale the infrastructure only when needed. The Repository Pattern ensures that growth doesn't require rewrites, just configuration changes.