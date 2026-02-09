# SAM Character Files

## Required Files

Add these two files to `/frontend/public/images/`:

### 1. **SAM_V2.png** (Static Image)
- Your new modern SAM character design
- Used for: Avatar in chat, floating button, message icons
- Recommended size: 512x512px or higher (square ratio)
- Format: PNG with transparent background

### 2. **SAM_idle_animation.mp4** (Sora Animation)
- Your Sora-generated idle animation
- Used for: Display above the text input when SAM is waiting
- Recommended: 3-5 second loop, 24fps
- Format: MP4, optimized for web (H.264 codec)
- Size: Keep under 5MB for fast loading

## How to Add Files

### Option 1: Via GitHub Web Interface
1. Go to: `https://github.com/jranderson1604/slabdash/tree/main/frontend/public/images`
2. Click "Add file" → "Upload files"
3. Drag both files (SAM_V2.png and SAM_idle_animation.mp4)
4. Commit changes

### Option 2: Via Command Line
```bash
# Navigate to the images folder
cd /home/user/slabdash/frontend/public/images

# Copy your files here (from wherever you saved them)
# Then commit:
git add SAM_V2.png SAM_idle_animation.mp4
git commit -m "✨ Add new SAM character model and idle animation"
git push
```

## What I've Already Updated

✅ **SAMAssistant.jsx** - Now uses your new files:
- Floating button shows SAM_V2.png with bounce animation
- Chat header shows SAM avatar
- Message bubbles show SAM avatar
- Idle animation plays above input box (looping video)
- Automatic fallback to emoji 🤖 if files missing

✅ **Welcome message** - Updated to reflect PSA expertise

✅ **Quick questions** - Changed to PSA-focused topics

## Testing

Once you add the files:
1. Open SlabDash in browser
2. Click the floating SAM button (bottom right)
3. You should see:
   - ✅ New SAM character in header
   - ✅ New SAM avatar in messages
   - ✅ Idle animation playing above input box
   - ✅ SAM bouncing on floating button

If files aren't found, it falls back to the 🤖 emoji automatically.
