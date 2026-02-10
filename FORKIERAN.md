# FORKIERAN.md - ServiceNow Image Resizer

*A personal learning journal for the ServiceNow Image Resizer project*

---

## What Is This Thing, Actually?

This is a purpose-built tool for preparing images for ServiceNow Knowledge Base articles. ServiceNow has specific requirements (documented in KB0696767) about what images you can upload - wrong format? Rejected. Too big? Looks terrible. Weird filename? Causes problems.

Instead of remembering all these rules and manually resizing in Photoshop, this tool enforces the rules automatically:
- Only accepts the three formats ServiceNow allows (JPG, PNG, GIF)
- Offers preset bounding boxes that fit images while preserving aspect ratio
- Sanitizes filenames to only valid characters
- Warns you if you try to upscale (which ServiceNow explicitly says not to do)

The magic is that it all happens right in your browser - images never leave your machine. Perfect for potentially sensitive KB content.

---

## The Big Picture: How It All Fits Together

```
┌─────────────────────────────────────────────────────────┐
│                      YOUR BROWSER                        │
│                                                          │
│  ┌──────────┐    ┌───────────┐    ┌──────────────────┐  │
│  │  Image   │───▶│  Canvas   │───▶│ Download Button  │  │
│  │  Input   │    │  (resize) │    │   (save file)    │  │
│  └──────────┘    └───────────┘    └──────────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │    Cloudflare Pages     │
              │   (just serves files)   │
              └─────────────────────────┘
```

The beautiful simplicity here: Cloudflare just serves static files. There's no server processing images, no database, no API calls. The browser does all the heavy lifting.

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

### Cloudflare Pages
**What it is:** Free static site hosting with global CDN.
**Why we chose it:** Dead simple deployment, fast everywhere, free tier is generous, and you're already familiar with it.

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
- No cookies, localStorage, or analytics

**What we added:**
1. **Subresource Integrity (SRI)** on the Pica CDN script - if someone compromises unpkg.com, the browser will reject the tampered script
2. **Security headers** via Cloudflare Pages `_headers` file:
   - `Content-Security-Policy` - restricts where scripts can load from
   - `X-Content-Type-Options: nosniff` - prevents MIME sniffing
   - `X-Frame-Options: DENY` - blocks clickjacking via iframes
   - `Referrer-Policy` - limits URL leakage
   - `Permissions-Policy` - disables unused browser APIs
3. **`.claude/` in .gitignore** - local Claude Code settings shouldn't be committed

**Lesson:** Even "simple" static sites benefit from a security checklist before going public. The attack surface is small, but defense-in-depth costs nothing and builds good habits.

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

*Last updated: 12 February 2026 - Added security hardening for public release*
