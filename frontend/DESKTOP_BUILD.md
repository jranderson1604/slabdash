# SlabDash Desktop App

Build SlabDash as a native desktop application for Windows, macOS, and Linux using Electron.

## Features

✨ **Native Desktop Experience**
- Runs offline once loaded
- Native menu bar and keyboard shortcuts
- System tray integration
- Auto-updates support (can be enabled)
- Native notifications

🚀 **Cross-Platform**
- Windows 10/11 (64-bit)
- macOS 10.13+ (Intel & Apple Silicon)
- Linux (AppImage, deb, rpm)

🔒 **Secure**
- Context isolation enabled
- Node integration disabled in renderer
- Secure preload script
- External links open in default browser

## Development

### Prerequisites

```bash
cd frontend
npm install
```

### Run in Development Mode

```bash
npm run electron:dev
```

This will:
1. Start Vite dev server on port 5173
2. Wait for server to be ready
3. Launch Electron window pointing to localhost:5173
4. Enable hot reload - changes appear instantly

### Debug

- Press `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows/Linux) to open DevTools
- Or use the menu: View → Toggle Developer Tools

## Building for Production

### Build for All Platforms (Current OS Only)

```bash
npm run electron:build
```

This creates installers in `dist-electron/` directory.

### Build for Specific Platforms

**Windows (requires Windows or cross-compilation setup):**
```bash
npm run electron:build:win
```

**macOS (requires macOS for signing):**
```bash
npm run electron:build:mac
```

**Linux:**
```bash
npm run electron:build:linux
```

## Output Files

After building, you'll find installers in `dist-electron/`:

### Windows
- `SlabDash Setup 1.0.0.exe` - Installer (NSIS)
- Installs to `C:\Program Files\SlabDash\`
- Creates desktop and start menu shortcuts

### macOS
- `SlabDash-1.0.0.dmg` - Drag-to-Applications installer
- `SlabDash-1.0.0-mac.zip` - Archive version
- Installs to `/Applications/SlabDash.app`

### Linux
- `SlabDash-1.0.0.AppImage` - Portable executable
- `slabdash_1.0.0_amd64.deb` - Debian/Ubuntu package
- Installs to `/opt/SlabDash/`

## Distribution

### Direct Distribution
Simply upload the built files to your website or file host. Users download and install.

### Code Signing (Recommended for Production)

**macOS:**
1. Get an Apple Developer account ($99/year)
2. Create a Developer ID certificate
3. Add to your environment:
   ```bash
   export CSC_LINK=/path/to/certificate.p12
   export CSC_KEY_PASSWORD=your_password
   ```
4. Build will automatically sign

**Windows:**
1. Get a code signing certificate (Sectigo, DigiCert, etc.)
2. Add to environment:
   ```bash
   set CSC_LINK=C:\path\to\certificate.pfx
   set CSC_KEY_PASSWORD=your_password
   ```
3. Build will automatically sign

### Auto-Updates (Optional)

To enable auto-updates, you need a release server. Options:

1. **GitHub Releases** (Free)
   - Tag releases in GitHub
   - electron-builder uploads automatically
   - App checks GitHub for updates

2. **Custom Server**
   - Host update manifest
   - Point app to your update URL

See `electron/main.js` to uncomment auto-updater code.

## Customization

### Change App Icon

Replace icons in `build/` directory:
- `icon.ico` - Windows
- `icon.icns` - macOS
- `icon.png` - Linux

See `build/README.md` for icon requirements.

### Change App Name

Edit `frontend/package.json`:
```json
{
  "name": "your-app-name",
  "productName": "Your App Display Name",
  "version": "1.0.0"
}
```

### Configure Build Options

Edit `build` section in `package.json`:
- Change app ID: `appId`
- Modify installer options
- Add file associations
- Configure protocol handlers

## Troubleshooting

### Build Fails on macOS

**Error:** "Code signing required"
- Either sign with a certificate (for distribution)
- Or disable signing temporarily:
  ```json
  "mac": {
    "identity": null
  }
  ```

### Windows Build on macOS/Linux

Install wine for cross-compilation:
```bash
brew install wine-stable  # macOS
sudo apt install wine     # Linux
```

### Large File Size

Electron apps bundle Chromium (~150MB). This is normal. To reduce:
- Use `asar` packing (enabled by default)
- Exclude unnecessary files in `build.files`
- Use electron-builder's compression

### App Won't Launch

- Check console for errors: `electron .` from terminal
- Verify all dependencies installed: `npm install`
- Clear cache: `rm -rf node_modules dist dist-electron && npm install`

## Architecture

```
frontend/
├── electron/
│   ├── main.js          # Main process (Node.js)
│   └── preload.js       # Secure bridge to renderer
├── src/                 # React app (renderer process)
├── build/               # Icons and resources
├── dist/                # Vite build output
└── dist-electron/       # Electron installers
```

### Process Model

1. **Main Process** (`electron/main.js`)
   - Creates windows
   - Handles native menus
   - Manages app lifecycle
   - Node.js access

2. **Renderer Process** (React app)
   - Your web UI
   - No Node.js access (security)
   - Communicates via IPC

3. **Preload Script** (`electron/preload.js`)
   - Secure bridge between main and renderer
   - Exposes only specific APIs

## Menu Shortcuts

### File
- `Cmd/Ctrl+R` - Reload app
- `Cmd/Ctrl+Q` - Quit

### Edit
- Standard cut/copy/paste
- `Cmd/Ctrl+Z` - Undo
- `Cmd/Ctrl+Shift+Z` - Redo

### View
- `Cmd/Ctrl+0` - Reset zoom
- `Cmd/Ctrl++` - Zoom in
- `Cmd/Ctrl+-` - Zoom out
- `Cmd/Ctrl+Option/Alt+I` - Toggle DevTools

### Window
- `Cmd/Ctrl+M` - Minimize
- `Cmd/Ctrl+F` - Toggle fullscreen

## Security Features

✅ **Context Isolation** - Renderer can't access Node APIs directly
✅ **No Remote Module** - Prevents remote code execution
✅ **Preload Script** - Only exposes whitelisted APIs
✅ **Web Security** - CSP and CORS enforced
✅ **External Links** - Open in default browser, not in app
✅ **Navigation Guard** - Prevents navigation to external sites

## Environment Variables

Set before building:

```bash
# Required for API connection
VITE_API_URL=https://api.slabdash.app

# Optional: Enable dev mode
NODE_ENV=development
ELECTRON_START_URL=http://localhost:5173
```

## Performance Tips

1. **Lazy Loading** - Already enabled in React
2. **Code Splitting** - Vite handles automatically
3. **Production Build** - Always use `npm run build` before packaging
4. **Minimize Dependencies** - Keep node_modules lean

## Next Steps

1. ✅ Development setup complete
2. 📦 Build for your platform: `npm run electron:build`
3. 🎨 Replace placeholder icon with your logo
4. 🔐 Get code signing certificate (for distribution)
5. 🚀 Distribute to users!

## Support

- **Issues:** https://github.com/anthropics/slabdash/issues
- **Email:** support@slabdash.app
- **Docs:** https://slabdash.app/help

---

**Built with Electron + React + Vite**

Happy building! 🚀
