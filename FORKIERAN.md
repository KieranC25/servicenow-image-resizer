# FORKIERAN.md - ServiceNow Image Tools

*A personal learning journal for the ServiceNow Image Tools project*

---

## What Is This Thing, Actually?

This is a purpose-built tool for preparing images for ServiceNow Knowledge Base articles. It has two columns:

**Left Column - Image Resizer:** Upload your own images and resize them to meet ServiceNow's requirements (KB0696767). Drag & drop, paste from clipboard, or click to upload.

**Right Column - Brand Logo Fetcher:** Search for company logos using the Brandfetch API. Get high-quality SVG/PNG logos with multiple variants (icon, logo, symbol) in light and dark themes.

Both columns have the same resize presets and export options, so whether you're uploading a screenshot or fetching a vendor logo, the workflow is consistent.

ServiceNow has specific requirements about what images you can upload - wrong format? Rejected. Too big? Looks terrible. Weird filename? Causes problems. This tool enforces the rules automatically:
- Only accepts the three formats ServiceNow allows (JPG, PNG, GIF)
- Offers preset bounding boxes that fit images while preserving aspect ratio
- Sanitizes filenames to only valid characters
- Warns you if you try to upscale (which ServiceNow explicitly says not to do)

The magic is that image processing happens right in your browser - images never leave your machine. The only network request is for brand logo search, which goes through a secure server-side proxy.

---

## The Big Picture: How It All Fits Together

```
┌────────────────────────────────────────────────────────────────────────┐
│                            YOUR BROWSER                                 │
│                                                                         │
│  ┌─────────────────────────┐    ┌─────────────────────────┐            │
│  │    LEFT: Upload Image   │    │   RIGHT: Brand Search   │            │
│  │  ┌───────┐   ┌───────┐ │    │  ┌───────┐   ┌───────┐  │            │
│  │  │ Drop/ │──▶│ Pica  │ │    │  │Search │──▶│ Pica  │  │            │
│  │  │ Paste │   │Resize │ │    │  │Brands │   │Resize │  │            │
│  │  └───────┘   └───┬───┘ │    │  └───┬───┘   └───┬───┘  │            │
│  └──────────────────┼─────┘    └──────┼───────────┼──────┘            │
│                     │                 │           │                    │
│                     ▼                 │           ▼                    │
│              ┌─────────────────────┐  │   ┌─────────────────────┐     │
│              │Download / Copy / Batch│  │   │Download / Copy / Batch│  │
│              └─────────────────────┘  │   └─────────────────────┘     │
│                                       │                                │
└───────────────────────────────────────┼────────────────────────────────┘
                                        │
                                        ▼
              ┌─────────────────────────────────────────┐
              │           Cloudflare Pages              │
              │  ┌──────────────┐  ┌────────────────┐  │
              │  │ Static Files │  │ Pages Function │  │
              │  │  index.html  │  │  /api/brand*   │  │
              │  └──────────────┘  └───────┬────────┘  │
              └────────────────────────────┼───────────┘
                                           │
                                           ▼
                              ┌─────────────────────┐
                              │   Brandfetch API    │
                              │  (logo database)    │
                              └─────────────────────┘
```

The architecture balances simplicity with capability:
- **Image processing** happens entirely in-browser (no server costs, great privacy)
- **Brand search** uses a Cloudflare Pages Function as a proxy (keeps API key server-side)
- **Static hosting** is free and globally distributed

---

## The Tech Stack: Why These Choices?

### Vanilla HTML/CSS/JavaScript
**What it is:** Plain old web code, no frameworks.
**Why we chose it:** For a simple tool like this, React or Vue would be overkill. It's like using a sledgehammer to hang a picture frame. Vanilla JS keeps the bundle at basically zero KB.

### Pica Library (Lanczos3 Resampling)
**What it is:** A ~50KB JavaScript library that provides professional-grade image resizing using the Lanczos3 algorithm.
**Why we chose it:** The basic Canvas API uses simple interpolation which can produce blurry or artifact-y results on significant size changes. Lanczos3 is the gold standard for image resampling - it's what Photoshop and other pro tools use.

**Key features:**
- Uses WebAssembly and WebWorkers when available (fast, non-blocking)
- Built-in unsharp masking for extra crispness
- MIT licensed, free for any use

**Limitation:** Canvas API (which Pica outputs to) can't export GIF format - only PNG and JPEG. If someone selects GIF output, we export as PNG instead.

### Cloudflare Pages & Pages Functions
**What it is:** Free static site hosting with global CDN, plus serverless functions.
**Why we chose it:** Dead simple deployment, fast everywhere, free tier is generous, and you're already familiar with it.

**Pages Functions:** The `/functions/api/brandfetch.js` file automatically becomes an API endpoint at `/api/brandfetch`. This is how Cloudflare Pages handles serverless - any file in the `functions/` directory becomes a route.

### Brandfetch API
**What it is:** A commercial API that provides access to brand logos, colors, and assets for thousands of companies.
**Why we chose it:** High-quality logos in multiple formats (SVG, PNG) and variants (icon, logo, symbol), with light/dark themes. Much better than scraping or using inconsistent sources.

**Key endpoints we use:**
- `GET /v2/search/{query}` - Search for brands by name
- `GET /v2/brands/{domain}` - Get full brand data including all logo variants

**Security consideration:** The server-side API key is stored as a Cloudflare environment variable. Users can also supply their own key via the UI — it's stored in localStorage and sent to the proxy via an `X-User-Api-Key` header. The proxy prefers the user key if present, falling back to the server key. This "Bring Your Own Key" (BYOK) pattern means self-hosters don't need to configure a server-side key at all.

### ServiceNow KB0696767 Compliance
**What it is:** ServiceNow's official image requirements for Knowledge Base.
**Key rules we enforce:**
- Formats: JPG, PNG, GIF only (no WebP, TIFF, PSD, PDF)
- Color mode: RGB only (CMYK doesn't render in browsers)
- Resolution: 96 DPI standard for web
- Preset bounding boxes: max 150×150, max 300×200, max 600×600
- Max widths: 840px (Portal), 960px (Legacy)
- **Aspect ratio always preserved** - images are never stretched or squashed
- No upscaling - always resize down, never up
- Filenames: alphanumeric, hyphens, underscores only

---

## Key Patterns and Concepts

### The FileReader Pattern
When someone drops an image, we can't just use it directly. We need to convert it to something JavaScript can work with:
```javascript
const reader = new FileReader();
reader.onload = (e) => {
  // e.target.result is now a data URL we can use
};
reader.readAsDataURL(file);
```

### The Canvas Resize Pattern
To resize an image with quality:
1. Create an off-screen canvas at the target size
2. Set `imageSmoothingQuality` to 'high'
3. Draw the source image onto the smaller canvas
4. Export the result

### The "Fit Within Bounding Box" Pattern
When you have a target size like "max 150×150", you need to fit the image inside it without distortion:
```javascript
const aspectRatio = originalWidth / originalHeight;
const boxRatio = maxWidth / maxHeight;

if (aspectRatio > boxRatio) {
  // Image is wider than box - constrain by width
  newWidth = maxWidth;
  newHeight = Math.round(maxWidth / aspectRatio);
} else {
  // Image is taller than box - constrain by height
  newHeight = maxHeight;
  newWidth = Math.round(maxHeight * aspectRatio);
}
```
This ensures the image fits entirely within the box while using as much space as possible.

### Debouncing Async Operations
When using async operations (like Pica resize) triggered by user input, you need debouncing to avoid:
1. Multiple simultaneous operations fighting each other
2. Wasted CPU on intermediate states
3. UI jank

```javascript
let resizeTimeout = null;
let isResizing = false;

function updatePreview() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => doResize(), 150); // Wait 150ms after last input
  // Update UI immediately for responsiveness
}

async function doResize() {
  if (isResizing) return; // Don't start if one is running
  isResizing = true;
  await picaInstance.resize(...);
  isResizing = false;
}
```

### Clipboard API Patterns
**Paste images from clipboard:**
```javascript
document.addEventListener('paste', (e) => {
  for (const item of e.clipboardData.items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile();
      // Process the file...
    }
  }
});
```

**Copy image to clipboard:**
```javascript
const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
```
Note: Clipboard API requires HTTPS (or localhost) and user gesture (click handler).

### Why Not Just CSS `width/height`?
CSS only changes how an image *displays*, not the actual pixels. If you set a 1000px image to display at 500px, you're still sending 1000px of data. Canvas actually creates a new, smaller image.

### Cloudflare Pages Functions Pattern
To add serverless API endpoints to a static site, just put JavaScript files in `/functions/`:
```
/functions/api/brandfetch.js → GET /api/brandfetch
/functions/hello.js → GET /hello
```

The function exports an `onRequest` handler:
```javascript
export async function onRequest(context) {
  const { request, env } = context;
  // env.MY_SECRET contains environment variables
  // request.url contains the full URL including query params

  return new Response(JSON.stringify({ data }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

**Key benefits:**
- No separate deployment - functions deploy with the site
- Access to environment variables via `env`
- Automatic HTTPS
- Globally distributed (runs at the edge)

---

## Bugs and Lessons Learned

### Bug #1: Images Getting Squashed Into Preset Dimensions
- **What happened:** A wide banner image (6394×1158px) was being forced into 150×150px, making it completely distorted and unreadable.
- **Why it happened:** The presets were using fixed dimensions (`width: 150, height: 150`) and drawing the image to exactly those sizes, ignoring the original aspect ratio.
- **How we fixed it:** Changed presets to be "bounding boxes" (`maxWidth: 150, maxHeight: 150`) and added logic to calculate the largest size that fits within the box while preserving aspect ratio. For a wide image, this means constraining by width; for a tall image, constraining by height.
- **Lesson:** When resizing images, **always preserve aspect ratio by default**. Users expect "fit within" behavior, not "stretch to fill". The calculation is: compare the image's aspect ratio to the box's aspect ratio to determine which dimension is the constraint.

### Bug #2: Race Condition in Async Resize
- **What happened:** If user changed dimensions rapidly while a resize was in progress, the final result could be wrong because the resize used stale values captured when the timeout was set.
- **Why it happened:** The debounced `setTimeout` captured dimension values at call time, but `doResize` ran later when values had changed.
- **How we fixed it:** Read dimension values inside `doResize` at execution time, and added a `pendingResize` flag to trigger another resize if changes occurred during processing.
- **Lesson:** With async operations, always read inputs at execution time, not at scheduling time. And if an operation can be interrupted, track whether a re-run is needed.

### Feature: Pad to Exact Size (Letterboxing)
Sometimes you need exact dimensions (e.g., 150×150 for a thumbnail) but your image is a different aspect ratio (e.g., 150×100). Instead of stretching, we:
1. Resize to fit within bounds (150×100)
2. Create a canvas at exact size (150×150)
3. Fill with background color
4. Center the resized image

**Auto-detect background color:** Sample pixels from all four edges and average them. This usually picks up the dominant border color of the original image.

### Feature: Batch Export
Export multiple preset sizes in one click. Key implementation details:
- Reuse the same `resizeForPreset` logic for consistency
- Add 300ms delay between downloads to avoid browser blocking
- Show progress during export ("Exporting 2/5...")
- Each file named with preset suffix: `image-thumbnail.png`, `image-medium.png`, etc.

### Security Hardening for Public Release
Before making the repo public, we did a senior security engineer review. Even though this is a simple static site with no backend, there were still things to harden:

**What we checked:**
- Secrets/credentials scan (API keys, tokens, passwords)
- Third-party dependency analysis
- XSS vectors (anywhere user input touches the DOM)
- Input validation (files, dimensions, filenames)
- Data privacy (where do images go?)
- OWASP Top 10 applicability

**What we found was already good:**
- All DOM updates use `textContent` not `innerHTML` with user data
- Filename sanitization uses strict allowlist: `[^a-zA-Z0-9\-_]`
- File type validation uses MIME type allowlist
- Images never leave the browser (excellent privacy)
- No cookies or analytics (localStorage used only for optional user API key)

**What we added:**
1. **Subresource Integrity (SRI)** on the Pica CDN script - if someone compromises unpkg.com, the browser will reject the tampered script
2. **Security headers** via Cloudflare Pages `_headers` file:
   - `Content-Security-Policy` - restricts where scripts can load from (uses `wasm-unsafe-eval` instead of `unsafe-eval` for Pica's WASM)
   - `X-Content-Type-Options: nosniff` - prevents MIME sniffing
   - `X-Frame-Options: DENY` - blocks clickjacking via iframes
   - `Referrer-Policy` - limits URL leakage
   - `Permissions-Policy` - disables unused browser APIs
3. **`.claude/` in .gitignore** - local Claude Code settings shouldn't be committed

**Lesson:** Even "simple" static sites benefit from a security checklist before going public. The attack surface is small, but defense-in-depth costs nothing and builds good habits.

### Bug #3: SSRF via Open Image Proxy
- **What happened:** The image proxy validated URLs with `imgUrl.includes('brandfetch.io')`, which is trivially bypassed — an attacker could request `?img=https://evil.com/brandfetch.io/path` and the check passes because the string contains "brandfetch.io".
- **How we fixed it:** Parse the URL properly with `new URL()` and validate the hostname with exact matching and `.endsWith()` against an allowlist of known Brandfetch domains.
- **Lesson:** Never validate URLs with substring matching. Always parse the URL and check the hostname. This is a classic SSRF pattern — if you're proxying requests, validate the *host*, not the *string*.

### Bug #4: Firefox Breaks on Implicit `event` Global
- **What happened:** The `selectBrand()` and `selectLogoVariant()` functions used the implicit `event` global to highlight the clicked card. This works in Chrome (which exposes `window.event`) but **completely breaks in Firefox** — brand selection did nothing.
- **How we fixed it:** Pass the event explicitly from the click handler: `card.addEventListener('click', (e) => selectBrand(brand, e))` and use `e.currentTarget` instead of `event.currentTarget`.
- **Lesson:** Never rely on the implicit `window.event` global. It's a legacy IE/Chrome quirk that Firefox deliberately doesn't support. Always pass the event as a parameter.

### Bug #5: Paste Handler Hijacks Text Inputs
- **What happened:** The global paste listener intercepted *all* paste events, including when pasting text into the filename, search, or API key fields. If the clipboard contained an image, it would load it instead of pasting the text.
- **How we fixed it:** Check `e.target.tagName` at the start of the handler and return early for `INPUT` and `TEXTAREA` elements.
- **Lesson:** Global event listeners need to be selective. Always check the event target to avoid intercepting events meant for other elements.

### Bug #6: Filename Sanitisation Fights the User
- **What happened:** The filename input sanitised on every keystroke (`input` event), which lowercased text and replaced characters as you typed. The cursor would jump to the end mid-typing — very jarring.
- **How we fixed it:** Changed from `input` to `blur` event — sanitisation only happens when the user leaves the field.
- **Lesson:** Real-time input sanitisation is almost always a bad UX pattern. Sanitise on blur or on submit, not on every keystroke. Let the user finish typing first.

### Feature: Brand Logo Fetcher
Added a second column for fetching brand logos from the Brandfetch API. Key implementation decisions:

**Why a server-side proxy?**
The Brandfetch API requires an API key. We could put it in the client-side code, but then anyone could steal it. Instead, we use a Cloudflare Pages Function as a proxy:
1. Browser calls `/api/brandfetch?q=microsoft`
2. Pages Function adds the API key and forwards to Brandfetch
3. Response flows back through the Function
4. API key never reaches the browser

**CORS and crossOrigin**
When loading images from Brandfetch's CDN to draw on Canvas, we need CORS headers. Setting `img.crossOrigin = 'anonymous'` tells the browser to make a CORS request. If Brandfetch's server doesn't send the right headers, Canvas will be "tainted" and we can't export it.

**Logo variants**
Brands often have multiple logo types:
- **icon**: Square, suitable for favicons and app icons (think the Twitter bird alone)
- **logo**: Horizontal lockup with wordmark (Twitter bird + "Twitter" text)
- **symbol**: The brand mark without text

Each can have light and dark variants. We display all available variants so users can pick the right one for their context.

**Reusing resize logic**
Rather than duplicating all the resize code, we made the core `resizeForPreset()` function accept the image and dimensions as parameters. Both columns call the same function, ensuring consistent quality and behavior.

---

## Best Practices That Emerged

### Keep It Client-Side When Possible
For tools that process user data (especially images), doing it client-side means:
- No server costs
- No privacy concerns
- No upload latency
- Works offline once loaded

### Don't Settle for Built-in Quality
The Canvas API's `imageSmoothingQuality: 'high'` sounds good but produces mediocre results for significant size reductions. When quality matters, use a proper resampling algorithm:
- **Lanczos3** (what Pica uses) is the industry standard
- The ~50KB library size is worth it for noticeably sharper output
- Multi-step Canvas resize is a free alternative but not as good

### Clipboard is Your Friend
Modern browsers have excellent clipboard APIs. For image tools:
- **Paste:** `document.addEventListener('paste', ...)` + `clipboardData.items`
- **Copy:** `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])`

This enables the screenshot workflow: capture → paste → resize → copy → paste into destination. No file management needed.

### Single-File Apps Are Underrated
For simple tools, putting everything in one HTML file:
- Makes deployment trivial
- Makes debugging easy (no "which file is this in?")
- Eliminates build steps

### Proxy Third-Party APIs (with BYOK)
Never put *your* API keys in client-side code. Instead:
1. Create a simple serverless function (Pages Functions, Vercel, etc.)
2. Store the API key as an environment variable
3. Browser calls your endpoint, which forwards to the real API
4. 10 lines of code, zero exposure risk

For open-source projects, add a **BYOK (Bring Your Own Key)** option: let users paste their own API key in the UI, store it in localStorage, and pass it to your proxy via a custom header. The proxy checks for a user key first, then falls back to the server key. This way your deployed instance works out of the box, but anyone who forks the repo can use it without configuring server-side secrets.

### Security Headers Cost Nothing
Even for static sites, add a `_headers` file (Cloudflare Pages) or equivalent:
```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' https://unpkg.com 'unsafe-inline'; ...
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
```

And always use **SRI (Subresource Integrity)** on CDN scripts:
```html
<script src="https://cdn.example.com/lib.js"
        integrity="sha384-[hash]"
        crossorigin="anonymous"></script>
```

Generate the hash with: `curl -s [URL] | openssl dgst -sha384 -binary | openssl base64 -A`

These are one-time additions that protect against supply chain attacks and give you an "A" on security scanners like Mozilla Observatory.

---

## What I'd Do Differently

*This section will grow as we gain hindsight.*

---

*Last updated: 24 February 2026 - Code review fixes (SSRF, Firefox event bug, paste handler, filename UX, CSP hardening)*
