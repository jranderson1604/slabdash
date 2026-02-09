# SAM Animation System - Complete Guide

## Overview

SAM (Submission Assistant Manager) now features a **fully animated, context-aware AI interface** that reacts to conversations with smooth, professional animations. This guide covers everything you need to know about the animation system.

---

## 🎬 Animation Files Required

All animation files must be placed in: **`/frontend/public/images/`**

### Required Files (11 total):

| File Name | Purpose | Duration | Loop | Trigger |
|-----------|---------|----------|------|---------|
| `SAM_V2.png` | Static fallback image | N/A | N/A | When videos fail to load |
| `SAM_idle_1.mp4` | Idle animation #1 | 8 seconds | ✅ Yes | Cycles automatically |
| `SAM_idle_2.mp4` | Idle animation #2 | 8 seconds | ✅ Yes | Cycles automatically |
| `SAM_idle_3.mp4` | Idle animation #3 | 8 seconds | ✅ Yes | Cycles automatically |
| `SAM_greeting.mp4` | Welcoming wave | 3 seconds | ❌ No | "hello", "hi", "hey" |
| `SAM_excitement.mp4` | Excited reaction | 2.5 seconds | ❌ No | "awesome", "great", "excellent" |
| `SAM_thinking.mp4` | Thoughtful pose | 4 seconds | ❌ No | "why", "how", "explain" |
| `SAM_celebration.mp4` | Happy celebration | 2 seconds | ❌ No | "thank", "got it", "understood" |
| `SAM_grading.mp4` | Explaining PSA grades | 3.5 seconds | ❌ No | "psa 10", "grade", "centering" |
| `SAM_pricing.mp4` | Discussing value | 3 seconds | ❌ No | "price", "value", "worth", "roi" |
| `SAM_service.mp4` | Service level discussion | 3 seconds | ❌ No | "service level", "bulk", "express" |
| `SAM_confused.mp4` | Confused/help needed | 2.5 seconds | ❌ No | "confused", "don't understand" |
| `SAM_typing.mp4` | Typing/thinking indicator | Continuous | ✅ Yes | While AI is responding |

---

## 📝 Animation Specifications

### Technical Requirements:
- **Format**: MP4 (H.264 codec)
- **Resolution**: 512x512px minimum (1024x1024px recommended)
- **Frame Rate**: 24fps or 30fps
- **File Size**: Under 2MB per file (optimized for web)
- **Background**: Transparent or solid color matching brand
- **Aspect Ratio**: 1:1 (square)

### Animation Style Guidelines:
- **Smooth Motion**: No jarring movements
- **Character Consistency**: SAM should look the same across all animations
- **Looping**: Idle animations must loop seamlessly
- **Expressiveness**: Facial expressions and body language should match emotion
- **Professional**: Fun but not cartoonish - this is a business tool

---

## 🤖 How the Animation System Works

### 1. **Idle Cycling** (Automatic)
- When SAM is not actively responding, it cycles through 3 idle animations
- Each idle animation plays for 8 seconds before switching
- Cycle order: `idle_1` → `idle_2` → `idle_3` → repeat
- Creates "living character" effect

### 2. **Keyword Triggers** (User Input)
When users type messages containing specific keywords, SAM triggers contextual animations:

```javascript
ANIMATION_TRIGGERS = {
  greeting: ['hello', 'hi', 'hey', 'greetings'],
  excitement: ['awesome', 'great', 'excellent', 'amazing', 'perfect'],
  thinking: ['why', 'how', 'what', 'when', 'explain'],
  celebration: ['thank', 'thanks', 'got it', 'understood'],
  grading: ['psa 10', 'gem mint', 'grade', 'centering', 'corners'],
  pricing: ['price', 'value', 'worth', 'cost', 'fee', 'roi'],
  service: ['service level', 'bulk', 'regular', 'express'],
  confused: ['confused', 'don\'t understand', 'unclear', 'help'],
}
```

**Example Flow:**
1. User types: "What makes a PSA 10?"
2. System detects keyword: "PSA 10" → triggers `grading` animation
3. `SAM_grading.mp4` plays for 3.5 seconds
4. Returns to idle cycle

### 3. **Response Animations** (AI Assistant)
- When SAM's response contains certain keywords, animations trigger
- Same keyword detection as user input
- Example: If SAM mentions "ROI" in response, triggers `pricing` animation

### 4. **Typing Indicator** (While Loading)
- When user sends message, `SAM_typing.mp4` plays continuously
- Loops until AI response arrives
- Then switches to response animation or idle

---

## 🎨 Creating Your Animations

### Option 1: Generate with AI (Sora, Runway, etc.)
1. **Sora Prompt Example**:
   ```
   "An orange blob character with a friendly face, wearing white sneakers with orange soles.
   The character is [SPECIFIC ACTION]. Professional 3D animation style, clean white background,
   smooth motion, looping seamlessly. The character should maintain consistent appearance
   throughout the animation."
   ```

2. **Action Variations**:
   - **Idle 1**: "Standing still with subtle breathing motion and occasional blink"
   - **Idle 2**: "Gently swaying side to side with curious look"
   - **Idle 3**: "Looking around slowly with contemplative expression"
   - **Greeting**: "Waving enthusiastically with big smile"
   - **Excitement**: "Jumping up and down with arms raised"
   - **Thinking**: "Hand on chin, looking upward thoughtfully"
   - **Celebration**: "Spinning in circle with confetti falling"
   - **Grading**: "Holding magnifying glass, examining closely"
   - **Pricing**: "Counting on fingers, nodding confidently"
   - **Service**: "Pointing to invisible chart, explaining"
   - **Confused**: "Scratching head, looking puzzled"
   - **Typing**: "Hands moving as if typing on keyboard"

### Option 2: Traditional Animation (Blender, After Effects)
1. Create 3D model of SAM character
2. Rig for animation
3. Animate each action
4. Export as MP4 with transparent background

### Option 3: Simple Motion Graphics (Figma + Plugin)
1. Use Figma to design character states
2. Use animation plugin (e.g., Jitter) for motion
3. Export as video

---

## 🚀 Implementation Steps

### Step 1: Generate/Create Animations
- Use AI tools (Sora, Runway ML, Kling AI)
- Or hire animator on Fiverr/Upwork
- Or use Blender/After Effects yourself

### Step 2: Optimize Videos
```bash
# Use FFmpeg to optimize (example):
ffmpeg -i input.mp4 -vf scale=1024:1024 -c:v libx264 -crf 28 -preset slow -c:a copy SAM_idle_1.mp4
```

### Step 3: Upload to Frontend
Place all files in: `/frontend/public/images/`

```
frontend/public/images/
├── SAM_V2.png
├── SAM_idle_1.mp4
├── SAM_idle_2.mp4
├── SAM_idle_3.mp4
├── SAM_greeting.mp4
├── SAM_excitement.mp4
├── SAM_thinking.mp4
├── SAM_celebration.mp4
├── SAM_grading.mp4
├── SAM_pricing.mp4
├── SAM_service.mp4
├── SAM_confused.mp4
└── SAM_typing.mp4
```

### Step 4: Enable SAM for Customer Portal
Add `sam_enabled` field to companies table:

```sql
-- Migration: Add SAM addon field
ALTER TABLE companies ADD COLUMN sam_enabled BOOLEAN DEFAULT FALSE;

-- Enable SAM for a specific company
UPDATE companies SET sam_enabled = TRUE WHERE id = 1;
```

### Step 5: Test the System
1. **Admin Dashboard**: Open SAM assistant
2. **Customer Portal**: Visit portal with `?token=XXX` param
3. **Test Keywords**: Type messages with trigger words
4. **Check Animations**: Verify correct animations play

---

## 🔧 Troubleshooting

### Animation Not Playing?
1. **Check file exists**: Open browser dev tools → Network tab
2. **Check file path**: Videos must be in `/frontend/public/images/`
3. **Check file format**: Must be MP4 (H.264)
4. **Check browser support**: Test in Chrome/Firefox

### Animation Not Triggering?
1. **Check keywords**: See `ANIMATION_TRIGGERS` in `SAMChatInterface.jsx`
2. **Check console**: Look for errors in browser console
3. **Check timing**: Animations may still be playing from previous trigger

### Fallback to Static Image?
- This is **intentional** - if videos fail to load, SAM shows static PNG
- Ensures SAM is always visible even if videos don't work

### Video Too Large / Slow Loading?
- Optimize with FFmpeg (see Step 2 above)
- Reduce resolution to 512x512px
- Increase compression (CRF 30-35)
- Consider WebM format as alternative

---

## 📊 Performance Considerations

### File Size Budget:
- Total animations: ~15-25MB (acceptable for modern web)
- Individual files: 1-2MB each
- Lazy loading: Videos load as needed, not all at once

### Browser Compatibility:
- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ✅ Safari: Full support (with MP4)
- ⚠️ Old browsers: Falls back to static image

---

## 🎯 Advanced Customization

### Adding New Animations:
1. Create new video file (e.g., `SAM_analyzing.mp4`)
2. Add to `ANIMATIONS` object in `SAMChatInterface.jsx`:
   ```javascript
   analyzing: '/images/SAM_analyzing.mp4',
   ```
3. Add trigger keywords:
   ```javascript
   analyzing: ['analyze', 'check', 'review', 'inspect'],
   ```
4. Add duration:
   ```javascript
   analyzing: 3000, // 3 seconds
   ```

### Customizing Timing:
Edit `ANIMATION_DURATIONS` in `SAMChatInterface.jsx`:
```javascript
const ANIMATION_DURATIONS = {
  idle: 8000,           // Change idle cycle speed
  greeting: 3000,       // Adjust animation length
  thinking: 4000,
  // etc...
};
```

---

## 📚 File Structure Summary

```
slabdash/
├── frontend/
│   ├── public/
│   │   └── images/
│   │       ├── SAM_V2.png               ← Static fallback
│   │       ├── SAM_idle_1.mp4           ← Idle animations
│   │       ├── SAM_idle_2.mp4
│   │       ├── SAM_idle_3.mp4
│   │       ├── SAM_greeting.mp4         ← Context animations
│   │       ├── SAM_excitement.mp4
│   │       ├── SAM_thinking.mp4
│   │       ├── SAM_celebration.mp4
│   │       ├── SAM_grading.mp4
│   │       ├── SAM_pricing.mp4
│   │       ├── SAM_service.mp4
│   │       ├── SAM_confused.mp4
│   │       └── SAM_typing.mp4           ← Loading animation
│   └── src/
│       └── components/
│           └── SAMChatInterface.jsx      ← Animation system code
└── backend/
    └── src/
        └── routes/
            └── portal.js                 ← Customer SAM access

```

---

## ✅ Testing Checklist

- [ ] All 13 animation files uploaded to `/frontend/public/images/`
- [ ] Static fallback image (`SAM_V2.png`) works
- [ ] Idle animations cycle automatically
- [ ] Keyword triggers work (test each category)
- [ ] Typing animation shows while loading
- [ ] Response animations trigger from SAM's replies
- [ ] Animations return to idle after completing
- [ ] Customer portal SAM tab appears (when `sam_enabled = true`)
- [ ] Backend `/portal/sam/chat` endpoint works
- [ ] No console errors in browser
- [ ] Videos load quickly (under 2MB each)
- [ ] Works on mobile devices

---

## 🎁 Example Test Script

Run these tests to verify everything works:

1. **Idle Test**: Open SAM, wait 30 seconds, confirm 3 idle animations cycle
2. **Greeting Test**: Type "Hello SAM!" → should trigger greeting animation
3. **Thinking Test**: Type "How does PSA grading work?" → should trigger thinking
4. **Grading Test**: Type "What's a PSA 10?" → should trigger grading animation
5. **Pricing Test**: Type "Is this card worth grading?" → should trigger pricing
6. **Service Test**: Type "Should I use Bulk or Express?" → should trigger service
7. **Celebration Test**: Type "Thanks, that helps!" → should trigger celebration
8. **Confused Test**: Type "I'm confused" → should trigger confused animation
9. **Loading Test**: Send any message → typing animation while waiting
10. **Response Test**: Wait for SAM's reply → animation triggers from keywords in response

---

## 🚨 Important Notes

1. **Don't Skip Static Image**: `SAM_V2.png` is critical as fallback
2. **Test Before Deploying**: Verify all animations work locally first
3. **Optimize File Sizes**: Large videos = slow loading = bad UX
4. **Customer Access**: Remember to set `sam_enabled = TRUE` in database
5. **API Key Required**: Ensure `ANTHROPIC_API_KEY` is set in backend `.env`

---

## 🎓 Need Help?

**Animation Issues?**
- Check browser console for errors
- Verify file paths in Network tab
- Test with static image first

**Backend Issues?**
- Check `ANTHROPIC_API_KEY` in `.env`
- Verify `sam_enabled` in companies table
- Test `/portal/sam/chat` endpoint directly

**Questions?**
Refer to:
- `SAMChatInterface.jsx` - Animation logic
- `portal.js` - Backend endpoint
- `CustomerPortal.jsx` - Tab integration

---

**Good luck! Your animated SAM assistant will blow customers away! 🚀**
