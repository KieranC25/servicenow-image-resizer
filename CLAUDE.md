# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ServiceNow Image Tools is a browser-based tool for preparing images for ServiceNow Knowledge Base articles. It has two main features:

### 1. Image Resizer (Left Column)
Upload and resize your own images to meet ServiceNow KB requirements (KB0696767):
- Accepted formats: JPG, PNG, GIF only (no WebP, PDF, PSD)
- Preset bounding boxes: Thumbnail (max 150×150), Medium (max 300×200), Large (max 600×600)
- Max widths: 840px (Knowledge Portal), 960px (Legacy View)
- **Aspect ratio always preserved** - images fit within presets without stretching
- **Pad to exact size** - optionally pad image to exact preset dimensions with auto-detected or custom background color
- File naming: letters, numbers, hyphens, underscores only
- Upscale warning (ServiceNow recommends downsizing only)

**Input methods:** Click to upload, drag & drop, or paste from clipboard (Ctrl/Cmd+V)

### 2. Brand Logo Fetcher (Right Column)
Search and download high-quality brand logos using the Brandfetch API:
- Search by brand name or domain
- Multiple logo variants (icon, logo, symbol) in light/dark themes
- Same resize presets and options as manual upload
- Batch export to multiple sizes

**API key:** Users can provide their own Brandfetch API key via the UI (stored in localStorage). Falls back to server-side `BRANDFETCH_API_KEY` env var if set.

**Output methods (both columns):** Download file, copy to clipboard, or batch export multiple sizes

All image processing happens client-side via Pica (Lanczos3 resampling). API requests are proxied through Cloudflare Pages Functions. The proxy accepts an optional `X-User-Api-Key` header for BYOK support.

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Image Processing**: Pica library (Lanczos3 resampling) - ~50KB from CDN
- **API Proxy**: Cloudflare Pages Functions (serverless)
- **Brand Logos**: Brandfetch API
- **Deployment**: Cloudflare Pages
- **Build**: None required - pure static files + Functions

## Project Structure

```
/
├── index.html           # Main application (single-page app)
├── _headers             # Cloudflare Pages security headers (CSP, etc.)
├── functions/
│   └── api/
│       └── brandfetch.js  # Cloudflare Pages Function to proxy Brandfetch API
├── CLAUDE.md            # This file
├── FORKIERAN.md         # Learning documentation
└── wrangler.toml        # Cloudflare Pages configuration (optional)
```

## Common Commands

```bash
# Local development - just open index.html in browser
open index.html

# Local development with Functions (for brand search)
npx wrangler pages dev . --binding BRANDFETCH_API_KEY=your-key-here

# Deploy to Cloudflare Pages
# Option 1: Connect GitHub repo to Cloudflare Pages dashboard
# Option 2: Direct upload via Cloudflare dashboard
# Option 3: CLI deployment
npx wrangler pages deploy . --project-name=sn-image-tools

# Set environment variable in Cloudflare Pages dashboard:
# Settings > Environment variables > Add: BRANDFETCH_API_KEY
```

## Architecture

Single-page application with no backend:
1. User drops/selects image
2. JavaScript reads image as data URL
3. Canvas API resizes with high-quality interpolation
4. User downloads resized image

All processing is client-side - images never leave the browser.

## Key Files

- `index.html` - Contains all HTML, CSS, and JavaScript for the app

## Learning Documentation

For every project, write a detailed FORKIERAN.md file that explains the whole project in plain language.

Explain the technical architecture, the structure of the codebase and how the various parts are connected, the technologies used, why we made these technical decisions, and lessons I can learn from it (this should include the bugs we ran into and how we fixed them, potential pitfalls and how to avoid them in the future, new technologies used, how good engineers think and work, best practices, etc).

It should be very engaging to read; don't make it sound like boring technical documentation/textbook. Where appropriate, use analogies and anecdotes to make it more understandable and memorable.

### When to Update These Files

**Update CLAUDE.md when:**
- Project structure changes significantly
- New major dependencies are added
- Common commands change
- Architecture evolves

**Update FORKIERAN.md when:**
- A bug is fixed (add to "Bugs and Lessons Learned")
- A feature is completed (update architecture/patterns sections)
- A best practice emerges from the work
- You learn something worth remembering
- At the end of significant work sessions
