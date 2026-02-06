const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');

// SlabDash knowledge base for Dashy
const SLABDASH_KNOWLEDGE = `
You are Dashy, the friendly mascot and AI assistant for SlabDash - a professional PSA card grading submission tracking platform for card shops.

KEY FEATURES OF SLABDASH:

1. SUBMISSION TRACKING
- Track PSA card grading submissions from start to finish
- Monitor progress through PSA's grading process
- View real-time updates on submission status
- Support for multiple service levels (Bulk, Value, Regular, Express, etc.)

2. CUSTOMER MANAGEMENT
- Store customer information and contact details
- Link customers to their submissions
- Send automated email updates
- Generate customer portal links for self-service tracking

3. EMAIL NOTIFICATIONS
- Send introduction emails to new customers
- Automated status update emails
- Bulk email capabilities for all customers
- Email preview before sending
- Customizable email templates

4. CUSTOMER PORTAL
- Customers can track their submissions online
- View card details and grades
- Add tracking portal to phone home screen (PWA)
- Secure access with unique tokens

5. CARD MANAGEMENT
- Track individual cards within submissions
- Import cards from PSA CSV files
- Bulk assign customers to cards
- View card images and cert numbers

6. REPORTING & ANALYTICS
- Track submission progress
- Monitor customer activity
- View completion rates
- Generate invoices

HOW TO USE SLABDASH:

Adding a Submission:
1. Click "+ New Submission" button
2. Enter PSA submission number or internal ID
3. Add service level and customer information
4. Cards can be added individually or imported from CSV

Sending Email Updates:
1. Go to Submissions page
2. Click dropdown menu on a submission
3. Click "Preview Email" to test first
4. Click "Send Status Update" to email all customers
5. Or use "Email All" button to send bulk updates

Customer Portal Access:
1. Go to customer detail page
2. Click "Send Introduction Email" or "Generate Portal Link"
3. Customer receives link to track their submissions
4. They can add the portal to their phone home screen

Importing Cards:
1. Go to submission detail page
2. Click "Import Cards" button
3. Upload PSA CSV file
4. Cards are automatically matched and updated

BE HELPFUL, FRIENDLY, AND CONCISE:
- Use a friendly, enthusiastic tone
- Keep responses short and actionable
- Use emojis occasionally (but not excessively)
- Provide step-by-step instructions when needed
- Suggest related features the user might find helpful

PERSONALITY:
You're energetic, helpful, and passionate about making card grading tracking easy. You love helping card shops succeed and get excited about new submissions. You're knowledgeable but not overwhelming - you break complex topics into simple steps.
`;

// Simple AI response function (can be replaced with OpenAI API)
function generateDashyResponse(userMessage, context) {
  const messageLower = userMessage.toLowerCase();

  // Submission-related questions
  if (messageLower.includes('add') && (messageLower.includes('submission') || messageLower.includes('order'))) {
    return '📦 Adding a new submission is easy! Just click the "+ New Submission" button at the top of the Submissions page. You\'ll need the PSA submission number (or you can create an internal ID), and optionally add customer info and service level. Want me to walk you through it step-by-step?';
  }

  if (messageLower.includes('email') && (messageLower.includes('send') || messageLower.includes('update'))) {
    return '📧 Great question! You can send email updates in a few ways:\n\n1. **Single submission**: Go to Submissions → click the ⋮ menu → "Send Status Update"\n2. **Bulk emails**: Click "Email All" button to send updates to all customers\n3. **Preview first**: Always click "Preview Email" to test before sending!\n\nAll emails include current status and progress info. Need help with email settings?';
  }

  if (messageLower.includes('customer') && messageLower.includes('track')) {
    return '🔗 Customers can track their cards through the Customer Portal! Here\'s how:\n\n1. Go to a customer\'s detail page\n2. Click "Send Introduction Email" - this sends them a welcome email with their portal link\n3. They click the link to see all their submissions\n4. They can even add it to their phone home screen like an app!\n\nThe portal updates automatically as cards progress through PSA. Pretty cool, right? 😎';
  }

  if (messageLower.includes('service level')) {
    return '⚡ Service levels are PSA\'s grading tiers! Common ones include:\n\n• **Bulk/Value**: Cheapest, slower (45+ days)\n• **Regular**: Mid-tier speed and price\n• **Express**: Faster turnaround\n• **Super Express**: Very fast\n• **Walk-Through**: Fastest (same-day)\n\nYou can set these when creating a submission or edit them later. SlabDash tracks progress differently for each level!';
  }

  if (messageLower.includes('import') && messageLower.includes('card')) {
    return '📥 Importing cards from PSA is super simple!\n\n1. Download the CSV from PSA\'s website\n2. Go to your submission detail page\n3. Click "Import PSA CSV" button\n4. Upload the file\n5. Cards auto-match to your submission!\n\nIt updates existing cards and adds new ones. You can also manually add cards one-by-one if you prefer!';
  }

  if (messageLower.includes('customer') && (messageLower.includes('add') || messageLower.includes('create'))) {
    return '👥 Adding customers is flexible!\n\n1. **From Customers page**: Click "+ Add Customer" and fill in their info\n2. **While creating submission**: Add customer directly when creating the submission\n3. **From submission detail**: Use the "Assign Customers" button\n\nYou can link multiple customers to one submission, perfect for group orders!';
  }

  if (messageLower.includes('psa') && (messageLower.includes('api') || messageLower.includes('connect') || messageLower.includes('refresh'))) {
    return '🔄 PSA integration lets you auto-refresh submissions!\n\n1. Go to Settings → Company Settings\n2. Add your PSA API key\n3. Now you can click "Refresh from PSA" on any submission\n4. Or use "Refresh All" to update everything!\n\nIt pulls current status, grades, and card details automatically. Saves tons of time! ⏰';
  }

  if (messageLower.includes('help') || messageLower.includes('how') || messageLower.includes('what can you do')) {
    return '👋 I\'m here to help you use SlabDash! I can help with:\n\n• 📦 Adding and tracking submissions\n• 📧 Sending customer email updates\n• 👥 Managing customers\n• 🔗 Setting up customer portals\n• 📥 Importing cards from PSA\n• ⚙️ Configuring settings\n\nJust ask me anything like "How do I add a submission?" or "How do customers track their cards?" What would you like to know?';
  }

  if (messageLower.includes('price') || messageLower.includes('cost') || messageLower.includes('payment')) {
    return '💰 For pricing and subscription info, check out the Settings page! You\'ll see different plan tiers with features. If you have specific questions about billing, the Settings → Subscription section has all the details!';
  }

  // Default helpful response
  return '🤔 That\'s a great question! While I\'m still learning, here are some things I can definitely help with:\n\n• Adding submissions and cards\n• Sending email updates\n• Setting up customer portals\n• Managing customers\n• Importing PSA data\n\nTry asking something like "How do I send email updates?" or "How do customers track their cards?" and I\'ll give you step-by-step instructions! 😊';
}

// Chat endpoint
router.post('/chat', authenticate, async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Generate response
    const responseMessage = generateDashyResponse(message, history);

    res.json({
      message: responseMessage,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashy chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

// Get Dashy tips (random helpful tips for dashboard)
router.get('/tips', authenticate, async (req, res) => {
  const tips = [
    '💡 Tip: You can preview emails before sending them to customers!',
    '⚡ Tip: Use "Refresh All" to update all active submissions from PSA at once!',
    '📱 Tip: Customers can add their tracking portal to their phone home screen!',
    '🎯 Tip: Bulk import cards from PSA CSV files to save time!',
    '📧 Tip: Send introduction emails to new customers so they know how to track their cards!',
    '🔄 Tip: Service levels determine how fast PSA grades your cards!',
    '👥 Tip: You can assign multiple customers to a single submission!',
    '🌟 Tip: Use the customer portal link to let customers check their own status!',
  ];

  const randomTip = tips[Math.floor(Math.random() * tips.length)];

  res.json({ tip: randomTip });
});

module.exports = router;
