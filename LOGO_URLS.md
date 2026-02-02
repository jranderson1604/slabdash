# SlabDash Logo URLs - PNG Format for Email Compatibility

## Primary Logo (Full - Icon + Text)
**Use this in Railway LOGO_URL variable:**
```
https://res.cloudinary.com/dtvffnzak/image/upload/f_png,w_600,q_auto/v1769987966/logo-full.png_1_leuu3f.png
```

## Secondary Logo (Icon Only)
**Use this in Railway LOGO_SECONDARY_URL variable:**
```
https://res.cloudinary.com/dtvffnzak/image/upload/f_png,w_200,q_auto/v1769988043/logo-icon.png_1_agwxvn.png
```

## What Changed:
- Added `f_png` to force PNG format (email clients don't support SVG)
- Added `w_600` (600px width) for full logo
- Added `w_200` (200px width) for icon logo
- Added `q_auto` for automatic quality optimization
- Changed file extension from `.svg` to `.png`

## Update These in Railway:
1. Go to your Railway project
2. Click "Variables" tab
3. Update both variables with the new PNG URLs above
4. Redeploy

Your logo will now show correctly in all email clients! ✅
