# SlabDash Icons

## Icon Requirements

For production builds, you'll need proper icon files:

### Windows (.ico)
- **256x256** - Required
- Use a tool like ImageMagick or online converter to convert the SVG to ICO format
- Save as `icon.ico` in this directory

### macOS (.icns)
- **512x512** and **1024x1024** - Required
- Use `iconutil` on macOS to create .icns from .iconset
- Save as `icon.icns` in this directory

### Linux (.png)
- **512x512** - Required
- Convert SVG to PNG at 512x512 resolution
- Save as `icon.png` in this directory

## Quick Conversion

### Using ImageMagick (Linux/Mac):
```bash
# Convert to PNG
convert icon.svg -resize 512x512 icon.png

# Convert to ICO (Windows)
convert icon.svg -resize 256x256 icon.ico
```

### Using macOS iconutil:
```bash
# 1. Create iconset directory
mkdir icon.iconset

# 2. Generate different sizes
for size in 16 32 64 128 256 512; do
  convert icon.svg -resize ${size}x${size} icon.iconset/icon_${size}x${size}.png
done

# 3. Create .icns file
iconutil -c icns icon.iconset

# 4. Clean up
rm -rf icon.iconset
```

## Placeholder Icons

The `icon.svg` file is a placeholder. Replace it with your branded logo before building for production.

The SVG shows:
- SlabDash brand colors (coral gradient)
- Card/slab representation
- PSA badge/shield
- Quality checkmark
- Star accents

For now, electron-builder will use the SVG and convert it automatically, but proper icon files will give better results.
