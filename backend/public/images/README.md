# SlabDash Logo Setup

## To add your logo to invoice emails:

### Option 1: Use Environment Variable (Recommended for Railway)

1. Go to your Railway project settings
2. Add an environment variable:
   - **Name:** `LOGO_URL`
   - **Value:** URL to your hosted logo (e.g., `https://your-domain.com/logo.png`)

3. Redeploy your backend

### Option 2: Host on Railway Backend

1. Upload your logo file to this directory (`backend/public/images/`)
2. Rename it to `slabdash-logo.png`
3. Set the environment variable:
   - **Name:** `LOGO_URL`
   - **Value:** `https://your-railway-app.up.railway.app/images/slabdash-logo.png`

### Logo Requirements:

- **Format:** PNG with transparent background (recommended)
- **Size:** Approximately 200px width, maintains aspect ratio
- **Height in email:** Will display at 45px height
- **Color:** Your coral #FF8170 color

### Fallback:

If no logo is found, the email will show "SLABDASH" text instead.

---

## Your Logo Files:

You have 3 logo variations:
1. **Horizontal logo** (icon + text) - Best for email headers
2. **Icon only** - Good for small spaces
3. **Horizontal logo** (alternate)

Upload the **horizontal logo** (first image) for the best invoice appearance.
