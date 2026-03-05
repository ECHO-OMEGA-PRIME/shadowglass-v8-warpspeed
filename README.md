# ShadowGlass v8 — WarpSpeed Ultimate

> Autonomous county records browser with stealth scraping across 80+ Texas counties. 259K+ deed records, PDF pipeline, OCR, and entity extraction.

[![Version](https://img.shields.io/badge/version-8.1.0-blue)]()
[![Platform](https://img.shields.io/badge/platform-Cloudflare%20Workers-orange)]()
[![Status](https://img.shields.io/badge/status-production-green)]()

## Overview

ShadowGlass v8 WarpSpeed is an all-in-one county deed record scraper supporting PublicSearch, Tyler Tech, TexasFile, and Tyler Odyssey platforms. It uses Cloudflare Browser Rendering for headless Chrome, Workers AI for OCR and entity extraction, queue-based job processing, and a full document intelligence pipeline. Includes stealth evasion with 30 user agents, Sec-CH-UA matching, circuit breakers, and exponential backoff.

```
┌──────────────────────────────────────────────────────────────┐
│              ShadowGlass v8 WarpSpeed Ultimate                │
│                                                                │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────┐ │
│  │ PublicSearch│  │ Tyler Tech │  │ TexasFile  │  │Odyssey │ │
│  │ Scraper    │  │ Scraper    │  │ Scraper    │  │Scraper │ │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘  └───┬────┘ │
│        │               │               │              │       │
│  ┌─────┴───────────────┴───────────────┴──────────────┴───┐  │
│  │              Stealth Evasion Engine                      │  │
│  │  30 UAs · Sec-CH-UA · Circuit Breakers · Backoff        │  │
│  └─────────────────────┬───────────────────────────────────┘  │
│                        │                                       │
│  ┌─────────────────────┴───────────────────────────────────┐  │
│  │              Document Intelligence Pipeline              │  │
│  │  PDF Download → OCR → Entity Extract → D1 Store → R2    │  │
│  └─────────────────────┬───────────────────────────────────┘  │
│                        │                                       │
│  ┌─────────────────────┴───────────────────────────────────┐  │
│  │  Queue · D1 · R2 · KV · Browser Rendering · Workers AI  │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## API Endpoints

### Dashboard & Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Interactive HTML dashboard |
| `GET` | `/health` | Health check with platform status |
| `GET` | `/stats` | Scraping statistics |
| `GET` | `/counties` | List all supported counties |
| `GET` | `/instruments` | List instrument types |
| `GET` | `/evasion` | Evasion engine status |
| `GET` | `/circuits` | Circuit breaker states |

### Scraping Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/scrape` | Submit single county scrape job |
| `POST` | `/scrape/all` | Scrape all instrument types for a county |
| `POST` | `/scrape/multi` | Multi-county batch scrape |
| `POST` | `/scrape/deep` | Deep scrape with PDF download |
| `POST` | `/scrape/direct` | Direct HTTP scrape bypass |
| `POST` | `/scrape/platform` | Platform-specific scrape |
| `POST` | `/scrape/permian` | Full Permian Basin scrape |
| `POST` | `/discover` | Auto-discover county instrument types |

### TexasFile Platform

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/scrape/texasfile` | TexasFile scrape job |
| `POST` | `/scrape/texasfile/login-probe` | Test TexasFile authentication |
| `POST` | `/scrape/texasfile/search-probe` | Test TexasFile search |
| `POST` | `/scrape/texasfile/http` | Direct HTTP TexasFile request |
| `POST` | `/scrape/texasfile/debug` | TexasFile debug mode |

### Tyler Odyssey Platform

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/odyssey/credentials` | Set Odyssey portal credentials |
| `GET` | `/odyssey/portals` | List Odyssey court portals |
| `POST` | `/odyssey/search` | Search Odyssey court records |
| `POST` | `/odyssey/case` | Get case details |
| `GET` | `/odyssey/records` | Browse Odyssey records |
| `GET` | `/odyssey/stats` | Odyssey scraping statistics |
| `GET` | `/odyssey/documents` | Get case documents |

### Data & Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/search` | Search records by county, type, grantor, grantee, date range |
| `GET` | `/d1/counts` | Record counts per county |
| `GET` | `/d1/total` | Total record count |
| `GET` | `/status` | All job statuses |
| `GET` | `/scrape/summary` | Scrape summary with watermarks |
| `GET` | `/test/tyler?county=X` | Test Tyler connection |
| `GET` | `/tyler/counties` | Tyler county list |

### Document Pipeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/pipeline/stats` | Pipeline processing statistics |
| `GET` | `/pipeline/search` | Search processed documents |
| `POST` | `/pipeline/analyze` | Analyze a document with AI |
| `POST` | `/pipeline/reanalyze` | Re-analyze with different parameters |
| `GET` | `/pipeline/cloud-map` | R2 cloud storage map |
| `GET` | `/pipeline/review` | Review pipeline output |
| `GET` | `/pipeline/cross-refs` | Cross-reference analysis |
| `GET` | `/stats/pdfs` | PDF download statistics |

### Chain of Title

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/chain/query` | Query chain-of-title data |
| `GET` | `/chain/party` | Search by party name |
| `GET` | `/chain/section` | Search by section/survey |
| `POST` | `/chain/backfill` | Backfill missing chain data |
| `GET` | `/chain/telemetry` | Chain processing telemetry |
| `GET` | `/chain/counties` | Counties with chain data |
| `GET` | `/chain/watermarks` | Scrape watermark positions |
| `POST` | `/chain/init` | Initialize chain schema |

### WarpSpeed (Bulk Operations)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/warpspeed` | Single WarpSpeed CSV import |
| `POST` | `/warpspeed/all` | Full WarpSpeed bulk import |
| `POST` | `/warpspeed/fetch-pdfs` | Batch PDF download |
| `POST` | `/warpspeed/history` | Import history |

### Jobs & Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/jobs/fix-stale` | Fix stale/stuck jobs |
| `POST` | `/jobs/reset` | Reset failed jobs |
| `GET` | `/debug/tyler-pdf` | Debug Tyler PDF downloads |
| `GET` | `/llm/status` | LLM provider status |
| `POST` | `/llm/test` | Test LLM connectivity |

## Cloudflare Bindings

| Type | Binding | Resource |
|------|---------|----------|
| D1 | `DB` | `shadowglass-scraper` — records, jobs, pipeline data |
| R2 | `R2_RECORDS` | `echo-prime-knowledge` — PDFs, images, documents |
| KV | `DEDUP_KV` | Deduplication, session state, credentials |
| Queue | `SCRAPE_QUEUE` | `shadowglass-v8-queue` — async job processing |
| Browser | `BROWSER` | Cloudflare Browser Rendering (headless Chrome) |
| AI | `AI` | Workers AI (OCR, document analysis) |

## Custom Domain

- `sg.echo-op.com` (route on `echo-op.com` zone)

## Cron Triggers

- `0 * * * *` — Hourly watermark-based re-scraping

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Language**: JavaScript
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Queue**: Cloudflare Queues
- **Browser**: Cloudflare Browser Rendering (Puppeteer)
- **AI**: Workers AI (Llama 3.2 11B Vision)
- **Platforms**: PublicSearch, Tyler Tech, TexasFile, Tyler Odyssey
- **Source Lines**: 6,587

## Deploy

```bash
npx wrangler deploy
```

## License

Proprietary — Echo Prime Technologies. All rights reserved.
