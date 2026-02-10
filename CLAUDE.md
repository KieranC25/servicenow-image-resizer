# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ServiceNow Image Resizer is a browser-based tool for resizing images to meet ServiceNow Knowledge Base requirements. It enforces ServiceNow's image guidelines (KB0696767) including:
- Accepted formats: JPG, PNG, GIF only (no WebP, PDF, PSD)
- Preset bounding boxes: Thumbnail (max 150×150), Medium (max 300×200), Large (max 600×600)
- Max widths: 840px (Knowledge Portal), 960px (Legacy View)
- **Aspect ratio always preserved** - images fit within presets without stretching
- **Pad to exact size** - optionally pad image to exact preset dimensions with auto-detected or custom background color
- File naming: letters, numbers, hyphens, underscores only
- Upscale warning (ServiceNow recommends downsizing only)

**Input methods:** Click to upload, drag & drop, or paste from clipboard (Ctrl/Cmd+V)
**Output methods:** Download file, copy to clipboard, or batch export multiple sizes

All processing happens client-side via Pica (Lanczos3 resampling).

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Image Processing**: Pica library (Lanczos3 resampling) - ~50KB from CDN
- **Deployment**: Cloudflare Pages (static site)
- **Build**: None required - pure static files

## Project Structure

```
/
├── index.html      # Main application (single-page app)
├── _headers        # Cloudflare Pages security headers (CSP, etc.)
├── CLAUDE.md       # This file
├── FORKIERAN.md    # Learning documentation
└── wrangler.toml   # Cloudflare Pages configuration (optional)
```

## Common Commands

```bash
# Local development - just open index.html in browser
open index.html

# Deploy to Cloudflare Pages
# Option 1: Connect GitHub repo to Cloudflare Pages dashboard
# Option 2: Direct upload via Cloudflare dashboard
# Option 3: CLI deployment
npx wrangler pages deploy . --project-name=icon-resizer
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
