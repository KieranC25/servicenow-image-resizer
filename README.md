# ServiceNow Image Tools

A browser-based tool for preparing images for ServiceNow Knowledge Base articles. Resize your own images or fetch high-quality brand logos - all processing happens client-side, so your images never leave your browser.

## Features

### Image Resizer
Upload and resize images to meet ServiceNow KB requirements (KB0696767):
- **Multiple input methods** - drag & drop, paste from clipboard (Ctrl/Cmd+V), or click to upload
- **ServiceNow presets** - Thumbnail (150×150), Medium (300×200), Large (600×600), Portal (840px), Legacy (960px)
- **Aspect ratio preserved** - images fit within presets without stretching
- **Pad to exact size** - optionally letterbox with auto-detected or custom background color
- **High-quality output** - Lanczos3 resampling via Pica library
- **Format compliance** - JPG, PNG, GIF only (as required by ServiceNow)
- **Filename sanitization** - auto-removes invalid characters
- **Upscale warnings** - alerts when enlarging images (not recommended)

### Brand Logo Fetcher
Search and download high-quality brand logos via the Brandfetch API:
- Search by brand name or domain
- Multiple logo variants (icon, logo, symbol)
- Light and dark theme options
- Same resize presets and export options as manual upload

### Export Options
- Download individual files
- Copy to clipboard
- Batch export to multiple sizes

## Quick Start

### Just want to resize images?
Open `index.html` directly in your browser. No build step required.

### Need brand logo search?
You have two options:

**Option A: Use your own API key (no server setup needed)**
1. Get a free API key at [developers.brandfetch.com](https://developers.brandfetch.com)
2. Open `index.html` in your browser
3. Expand "Use your own Brandfetch API key" under the search box and paste your key
4. Your key is saved in your browser's localStorage

**Option B: Run with a server-side key via Wrangler**
```bash
npx wrangler pages dev . --binding BRANDFETCH_API_KEY=your-api-key
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Vanilla HTML/CSS/JavaScript |
| Image Processing | [Pica](https://github.com/nodeca/pica) (Lanczos3 resampling) |
| API Proxy | Cloudflare Pages Functions |
| Brand Logos | [Brandfetch API](https://brandfetch.com/developers) |
| Hosting | Cloudflare Pages |

## Project Structure

```
/
├── index.html              # Main application (single-page app)
├── _headers                # Cloudflare security headers (CSP, etc.)
├── functions/
│   └── api/
│       └── brandfetch.js   # API proxy for Brandfetch
├── wrangler.toml           # Cloudflare Pages config
├── CLAUDE.md               # AI assistant instructions
└── FORKIERAN.md            # Learning documentation
```

## Development

### Local Development (Basic)
```bash
# Just open in browser - no build needed
open index.html
```

### Local Development (With Brand Search)
```bash
# Install Wrangler if needed
npm install -g wrangler

# Run with API key binding
npx wrangler pages dev . --binding BRANDFETCH_API_KEY=your-key
```

## Deployment

### Cloudflare Pages (Recommended)

1. **Connect Repository**
   - Go to Cloudflare Pages dashboard
   - Create new project → Connect to Git
   - Select this repository

2. **Configure Build**
   - Build command: (leave empty)
   - Build output directory: `/`

3. **Set Environment Variable**
   - Settings → Environment variables
   - Add `BRANDFETCH_API_KEY` with your API key

### Manual Deploy
```bash
npx wrangler pages deploy . --project-name=sn-image-tools
```

## Security

This tool follows security best practices:

- **Privacy first** - All image processing happens client-side; images never leave your browser
- **API key protection** - Server-side key stored as env var; user-provided keys stay in localStorage and are sent via header (never logged)
- **Content Security Policy** - Strict CSP with `wasm-unsafe-eval` (not `unsafe-eval`) for Pica's WebAssembly support
- **SSRF protection** - Image proxy validates hostnames strictly (not substring matching) to prevent open proxy abuse
- **Subresource Integrity** - CDN scripts verified with SRI hashes
- **Input validation** - Strict allowlists for file types and filenames
- **Minimal storage** - Only localStorage used is for optional user API key; no cookies or analytics

## License

MIT

## Contributing

Contributions welcome! Please read the existing code style and test your changes locally before submitting a PR.
