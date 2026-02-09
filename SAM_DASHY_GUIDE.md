# SAM & Dashy - AI Assistant Guide

## What Are SAM and Dashy?

**SAM** = **S**ubmission **A**ssistant **M**anager
**Dashy** = Friendly mascot version of SAM

Both are AI-powered chat assistants built into SlabDash to help users with:
- Understanding SlabDash features
- Troubleshooting issues
- Quick answers to common questions
- Guided workflows

## How It Works

### The Technology
- **AI Model:** Claude 3.5 Sonnet (Anthropic)
- **Fallback:** Rule-based responses (works without API key)
- **Context:** Maintains last 10 messages for conversation flow
- **Knowledge:** Pre-loaded with SlabDash documentation

### API Endpoints

**SAM Routes** (`/backend/src/routes/sam.js`):
- `POST /api/sam/chat` - Send message, get AI response
- `GET /api/sam/tips` - Get random helpful tip

**Dashy Routes** (`/backend/src/routes/dashy.js`):
- Same as SAM but with friendlier personality

### Frontend Components

**SAM Component** (`/frontend/src/components/SAMAssistant.jsx`):
- Professional assistant
- Formal responses
- Detailed explanations

**Dashy Component** (`/frontend/src/components/DashyAssistant.jsx`):
- Friendly mascot
- Casual tone
- Quick answers with personality

---

## Setup Instructions

### 1. Get Anthropic API Key

1. Go to https://console.anthropic.com/settings/keys
2. Sign up or log in
3. Click "Create Key"
4. Copy the key (starts with `sk-ant-api03-`)

### 2. Add to Environment

**In `backend/.env`:**
```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
```

**Cost:**
- ~$0.01 per conversation (10-20 messages)
- Claude 3.5 Sonnet: $3 per million input tokens, $15 per million output tokens
- Very affordable for typical usage

### 3. Restart Backend

```bash
cd backend
npm start
```

You should see in the logs:
```
✅ SAM AI Assistant: Anthropic API configured
```

If API key is missing:
```
⚠️  SAM AI Assistant: Using fallback responses (Anthropic API key not configured)
```

---

## How to Use

### In the Frontend

1. Look for the floating chat button (bottom right corner)
2. Click to open chat window
3. Type your question
4. Get instant AI-powered answer

### Example Questions

**Feature Help:**
- "How do I create a new submission?"
- "What's the difference between Economy and Express service?"
- "How do I track a submission?"

**Troubleshooting:**
- "Why isn't my PSA login working?"
- "My customer didn't receive an email"
- "How do I change my company logo?"

**Business:**
- "What are the pricing tiers?"
- "Can I white-label SlabDash?"
- "How do buyback offers work?"

---

## Fallback Mode (No API Key)

If `ANTHROPIC_API_KEY` is not set, SAM/Dashy use **rule-based responses**:

**50+ Pre-programmed Patterns:**
- Email keywords → Email setup guide
- Submission keywords → Submission workflow
- Customer keywords → Customer management help
- PSA keywords → PSA API troubleshooting

**Example:**
```javascript
User: "How do I add a customer?"
SAM: "To add a customer, go to Customers page → Add Customer button..."
```

Works offline, but less flexible than AI mode.

---

## Customization

### Changing SAM's Personality

Edit the system prompt in `/backend/src/routes/sam.js`:

```javascript
const systemPrompt = `You are SAM, SlabDash's AI assistant.

Personality:
- Professional and helpful
- Concise but thorough
- Uses examples when helpful

Your knowledge:
- SlabDash features
- PSA grading process
- Email configuration
- Customer management
...
`;
```

### Adding New Knowledge

Update the `SLABDASH_KNOWLEDGE` constant in sam.js:

```javascript
const SLABDASH_KNOWLEDGE = {
  submissions: "...",
  cards: "...",
  // Add new sections here
  scanner: "The card scanner helps users decide if a card is worth grading..."
};
```

### Changing Dashy's Tone

Edit `/backend/src/routes/dashy.js` system prompt for more/less casual responses.

---

## Testing

### Test SAM is Working

**Using curl:**
```bash
curl -X POST http://localhost:3001/api/sam/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"message": "Hello SAM!"}'
```

**Expected Response:**
```json
{
  "response": "Hello! I'm SAM, your SlabDash assistant. How can I help you today?",
  "source": "claude-api"
}
```

If using fallback:
```json
{
  "response": "...",
  "source": "fallback"
}
```

### Test Random Tips

```bash
curl http://localhost:3001/api/sam/tips \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Troubleshooting

### "SAM not responding"

**Check:**
1. Is backend running? (`npm start` in `/backend`)
2. Is API key set? (Check logs for "✅ SAM AI Assistant configured")
3. Is user authenticated? (SAM requires valid JWT token)

### "Getting fallback responses instead of AI"

**Reasons:**
1. `ANTHROPIC_API_KEY` not set
2. API key is invalid/expired
3. Anthropic API is down (check status.anthropic.com)
4. Rate limit exceeded (unlikely with normal use)

**Check logs:**
```
⚠️  SAM AI Assistant: Using fallback responses
```

### "API key exposed" warning

If you see this warning, it means your API key was committed to git.

**Fix:**
1. Go to https://console.anthropic.com/settings/keys
2. Delete the exposed key
3. Create a new key
4. Update `backend/.env` with new key
5. Make sure `backend/.env` is in `.gitignore`
6. Run `git rm --cached backend/.env`

---

## Cost Monitoring

### Track API Usage

Check Anthropic console: https://console.anthropic.com/settings/usage

**Typical costs:**
- 1 conversation (10 messages) = ~$0.01
- 100 conversations/day = $1/day = $30/month
- 1,000 conversations/day = $10/day = $300/month

### Set Budget Alerts

In Anthropic console:
1. Go to Settings → Usage
2. Set monthly budget limit
3. Get email when 50%, 80%, 100% reached

---

## Production Deployment

### Railway Setup

1. Go to Railway dashboard
2. Select your project → Backend service
3. Go to Variables tab
4. Add variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** `sk-ant-api03-your-key-here`
5. Deploy/restart service

### Vercel Setup (Frontend)

Dashy/SAM work automatically once backend is configured.
No frontend environment variables needed.

---

## Security Best Practices

### ✅ DO:
- Keep API key in `.env` file (not committed to git)
- Use different keys for dev/staging/prod
- Set budget limits in Anthropic console
- Monitor usage regularly
- Rotate keys if exposed

### ❌ DON'T:
- Commit `.env` to git
- Share API keys in chat/email
- Use production key for local development
- Hardcode keys in source code

---

## Advanced Features

### Context Awareness

SAM remembers last 10 messages:

```javascript
User: "How do I create a submission?"
SAM: "Go to Submissions → New Submission..."

User: "What about the customer email?"
SAM: "In the submission form, enter customer email..."
```

SAM knows "the customer email" refers to the submission context.

### Dynamic Information

SAM can reference:
- Current user's company name
- User's role (owner, admin, staff)
- Available features based on plan
- Recent activity (if passed in context)

### Multiple Assistants

You can run both SAM and Dashy:
- SAM for admin/professional users
- Dashy for customer-facing portal
- Same backend, different personalities

---

## Roadmap

### Planned Features
- [ ] Voice input/output
- [ ] Multi-language support
- [ ] Image analysis (card condition assessment)
- [ ] Proactive suggestions ("You have 3 submissions ready to ship!")
- [ ] Integration with calendar ("Submission #123 should return next week")

### Coming Soon
- GPT-4 support (alternative to Claude)
- Custom training on company-specific data
- Analytics dashboard (most asked questions, satisfaction scores)

---

## FAQ

**Q: Does SAM work without internet?**
A: Yes, in fallback mode (rule-based). AI mode requires internet.

**Q: Can SAM access my submission data?**
A: Not currently. SAM only has general SlabDash knowledge. Future versions may support personalized data.

**Q: How accurate is SAM?**
A: Very accurate for SlabDash features. May hallucinate for edge cases. Always verify critical information.

**Q: Can customers see SAM?**
A: Yes, if you add the component to customer portal. Dashy is designed for customer-facing use.

**Q: What if I exceed my Anthropic budget?**
A: SAM automatically falls back to rule-based responses. No service disruption.

---

## Support

**Issues:**
- GitHub: https://github.com/jranderson1604/slabdash/issues
- Email: support@slabdash.app

**API Issues:**
- Anthropic Support: https://console.anthropic.com/

**Documentation:**
- Claude API Docs: https://docs.anthropic.com/
- SlabDash Docs: /README.md

---

**Last Updated:** 2026-02-09
**Version:** 1.0
**Status:** ✅ Production Ready
