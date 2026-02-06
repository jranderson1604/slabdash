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

// Enhanced AI response function with comprehensive knowledge base
function generateDashyResponse(userMessage, context) {
  const messageLower = userMessage.toLowerCase();
  const words = messageLower.split(' ');

  // SUBMISSIONS - Creating and managing
  if ((messageLower.includes('add') || messageLower.includes('create') || messageLower.includes('new')) &&
      (messageLower.includes('submission') || messageLower.includes('order'))) {
    return '📦 **Creating a New Submission:**\n\n1. Click **"+ New Submission"** at the top of the Submissions page\n2. Enter the **PSA submission number** (or create an internal ID)\n3. Select **service level** (Bulk, Regular, Express, etc.)\n4. Add **customer** (optional - can add later)\n5. Set **date sent** if needed\n6. Click **Create**!\n\nYou can add cards individually or import them later from PSA CSV. Want to know more about any step?';
  }

  if (messageLower.includes('edit') && messageLower.includes('submission')) {
    return '✏️ **Editing Submissions:**\n\n1. Go to submission detail page\n2. Click **"Edit"** button\n3. Update PSA number, service level, or dates\n4. Click **"Save Changes"**\n\nYou can also edit service levels directly from the submissions list by clicking the dropdown!';
  }

  if (messageLower.includes('delete') && messageLower.includes('submission')) {
    return '🗑️ **Deleting Submissions:**\n\n**Single submission:** Click ⋮ menu → Delete\n**Multiple:** Select checkboxes → "Delete Selected"\n\n⚠️ This permanently removes the submission and all its cards. Customer data stays safe.';
  }

  if (messageLower.includes('track') || messageLower.includes('status') || messageLower.includes('progress')) {
    return '📊 **Tracking Submission Progress:**\n\nSlabDash shows real-time PSA status:\n\n• **Progress bar** - Visual % complete\n• **Current step** - Where PSA is processing\n• **Service level** - Expected timeline\n• **Auto-refresh** - Get latest from PSA\n\nClick any submission to see full details including card-by-card grades!';
  }

  // EMAIL - All email features
  if ((messageLower.includes('email') || messageLower.includes('send') || messageLower.includes('notify')) &&
      (messageLower.includes('update') || messageLower.includes('status'))) {
    return '📧 **Sending Status Update Emails:**\n\n**Single submission:**\n1. Go to Submissions page\n2. Click ⋮ menu on any submission\n3. Click **"Preview Email"** to test first\n4. Click **"Send Status Update"**\n\n**All customers:**\nClick **"Email All"** button in toolbar\n\n**From submission detail:**\nClick **"Send Update"** button\n\n💡 Always preview first! Emails include current status, progress %, and service level.';
  }

  if (messageLower.includes('introduction') || messageLower.includes('welcome')) {
    return '👋 **Introduction Emails:**\n\nSend new customers a welcome email with:\n• How to use SlabDash\n• Their portal link\n• List of their submissions\n• Mobile app instructions\n\n**To send:**\n1. Go to Customers page or customer detail\n2. Click **"Preview Email"** to test\n3. Click **"Send Introduction Email"**\n\nGreat for first-time customers!';
  }

  if (messageLower.includes('preview') || (messageLower.includes('test') && messageLower.includes('email'))) {
    return '👀 **Email Previews:**\n\nEVERY email feature has a preview option!\n\n1. Click **"Preview Email"** button\n2. Enter your test email address\n3. Click **"Send Test Email"**\n4. Check your inbox to see exactly what customers will receive\n\nPreviews have [TEST PREVIEW] in the subject line. Always test before sending to customers!';
  }

  // CUSTOMERS - Customer management
  if ((messageLower.includes('add') || messageLower.includes('create')) && messageLower.includes('customer')) {
    return '👥 **Adding Customers:**\n\n**Method 1 - Customers page:**\n1. Click **"+ Add Customer"**\n2. Fill in name, email, phone\n3. Click **Save**\n\n**Method 2 - During submission:**\nAdd customer while creating submission\n\n**Method 3 - Bulk import:**\nUse CSV import for multiple customers\n\n💡 Customers can be linked to multiple submissions!';
  }

  if (messageLower.includes('portal') || (messageLower.includes('customer') && messageLower.includes('track'))) {
    return '🔗 **Customer Portal:**\n\nLet customers track their own cards!\n\n**Setup:**\n1. Go to customer detail page\n2. Click **"Send Introduction Email"** (includes portal link)\n   OR\n3. Click **"Generate Portal Link"** (copy/paste yourself)\n\n**What customers see:**\n• All their submissions\n• Card details and grades\n• Real-time status updates\n• Can add to phone home screen!\n\nPortal links work for 1 year. Customers don\'t need to log in!';
  }

  if (messageLower.includes('assign') && (messageLower.includes('customer') || messageLower.includes('submission'))) {
    return '🔗 **Assigning Customers to Submissions:**\n\n**Single customer:**\n1. Go to submission detail\n2. Click **"Assign Customers"**\n3. Select customer from list\n\n**Multiple customers:**\n1. Go to Customers page\n2. Select customers (checkboxes)\n3. Click **"Add to Submission"**\n4. **Search** for submission by number\n5. Click **Add**\n\nGreat for group orders where multiple people share one submission!';
  }

  // CARDS - Card management
  if (messageLower.includes('import') && (messageLower.includes('card') || messageLower.includes('csv') || messageLower.includes('psa'))) {
    return '📥 **Importing Cards from PSA:**\n\n1. **Download CSV** from PSA website\n2. Go to **submission detail** page\n3. Click **"Import PSA CSV"** button\n4. Upload the file\n5. **Auto-matching happens!**\n   • Updates existing cards\n   • Adds new cards\n   • Pulls grades, cert numbers, status\n\n**CSV Import** (toolbar button):\n• Import to existing or new submission\n• Auto-refresh after import\n• Great for bulk updates!\n\nNo duplicate cards created - smart matching by cert number!';
  }

  if ((messageLower.includes('add') || messageLower.includes('create')) && messageLower.includes('card')) {
    return '🃏 **Adding Individual Cards:**\n\n1. Go to submission detail page\n2. Click **"+ Add Card"** button\n3. Fill in:\n   • Card description (player, year, set)\n   • Declared value\n   • Sport/category\n   • Customer (optional)\n4. Click **Save**\n\n**Tips:**\n• Import CSV for bulk adds\n• Assign customers to cards for tracking\n• Update cards when PSA grades them';
  }

  if (messageLower.includes('grade') || messageLower.includes('cert')) {
    return '💎 **Card Grades & Cert Numbers:**\n\nPSA grades appear after importing CSV:\n\n• **Grade** - 1-10 rating (10 is perfect!)\n• **Cert number** - Unique PSA identifier\n• **Card images** - Upload front/back photos\n\n**Auto-populate:**\nImport PSA CSV to automatically fill grades and cert numbers for all cards in a submission!';
  }

  // PSA INTEGRATION
  if (messageLower.includes('psa') && (messageLower.includes('api') || messageLower.includes('key') || messageLower.includes('connect'))) {
    return '🔑 **PSA API Integration:**\n\n**Setup:**\n1. Go to **Settings → Company Settings**\n2. Enter your **PSA API key**\n3. Click **Save**\n\n**Benefits:**\n• Auto-refresh submission status\n• Pull grades and cert numbers\n• Track progress through PSA steps\n• Save time vs manual updates\n\n**Get API key:** Contact PSA or check your PSA account settings.';
  }

  if (messageLower.includes('refresh') && (messageLower.includes('psa') || messageLower.includes('submission'))) {
    return '🔄 **Refreshing from PSA:**\n\n**Single submission:**\n1. Click ⋮ menu → **"Refresh from PSA"**\n2. Waits 8-12 seconds (avoid rate limits)\n3. Updates status, progress, grades\n\n**All submissions:**\nClick **"Refresh All"** button\n• Updates active submissions\n• Skips completed ones\n• PSA limits: 100 calls/day\n\n⚠️ Need PSA API key first! (Settings → Company)';
  }

  // SERVICE LEVELS
  if (messageLower.includes('service') && messageLower.includes('level')) {
    return '⚡ **PSA Service Levels:**\n\n**Economy Tiers:**\n• **Bulk** - $19-25, 65+ days\n• **Value** - ~$40, 45+ days\n\n**Standard Tiers:**\n• **Regular** - ~$75, 30+ days\n• **Express** - ~$150, 15+ days\n\n**Premium Tiers:**\n• **Super Express** - ~$300, 5+ days\n• **Walk-Through** - ~$600, 1-2 days\n\n**In SlabDash:**\n• Set during submission creation\n• Edit anytime from submissions list\n• Track different timelines\n• Filter by service level\n\nPrices and times vary - check PSA website for current rates!';
  }

  // SETTINGS
  if (messageLower.includes('setting') || messageLower.includes('config')) {
    return '⚙️ **Settings & Configuration:**\n\n**Company Settings:**\n• PSA API key\n• Company name\n• Logo upload\n\n**Email Settings:**\n• Enable/disable notifications\n• Custom SMTP (or use default)\n• Test email configuration\n• Email templates\n\n**Subscription:**\n• View current plan\n• Upgrade/downgrade\n• Billing history\n\nAccess: Click your profile → **Settings**';
  }

  // GENERAL HELP
  if (messageLower.includes('help') || messageLower.includes('what can') || messageLower.includes('how to use')) {
    return '👋 **Hey! I\'m Dashy, your SlabDash guide!**\n\nI can help you with:\n\n📦 **Submissions**\n• Creating & editing\n• Tracking status\n• Importing PSA data\n\n📧 **Emails**\n• Status updates\n• Welcome emails\n• Previewing before sending\n\n👥 **Customers**\n• Adding & managing\n• Portal access\n• Bulk assignments\n\n🃏 **Cards**\n• Adding individually\n• Importing from CSV\n• Grades & cert numbers\n\n⚙️ **Settings**\n• PSA API integration\n• Email configuration\n• Subscriptions\n\nJust ask me anything! Like "How do I import cards?" or "How do I send emails?"';
  }

  // PRICING
  if (messageLower.includes('price') || messageLower.includes('cost') || messageLower.includes('plan') || messageLower.includes('subscription')) {
    return '💰 **SlabDash Pricing & Plans:**\n\n**Starter** - $29/mo\n• 100 submissions/month\n• Basic features\n• Email support\n\n**Professional** - $79/mo\n• Unlimited submissions\n• All features\n• Priority support\n• Custom branding\n\n**Enterprise** - Custom\n• Multi-location\n• API access\n• Dedicated support\n\n**View plans:** Settings → Subscription\n\n💡 All plans include customer portal, email notifications, and PSA integration!';
  }

  // SPECIFIC FEATURES
  if (messageLower.includes('invoice') || messageLower.includes('billing')) {
    return '💵 **Invoices & Billing:**\n\n• Create invoices for customers\n• Track payments\n• Download PDF invoices\n• Email directly to customers\n\n**Access:** Submission detail → **Invoices** tab\n\nGreat for charging customers for grading services!';
  }

  if (messageLower.includes('search') || messageLower.includes('find')) {
    return '🔍 **Search & Filtering:**\n\n**Submissions:**\n• Search by PSA number or customer\n• Filter by status (active/shipped/problems)\n• Filter by service level\n• Sort by date/number\n\n**Customers:**\n• Search by name, email, phone\n• Filter by submissions\n\n**Cards:**\n• Search by description\n• Filter by sport/category\n• Filter by grade\n\nUse the search bar at the top of each page!';
  }

  if (messageLower.includes('mobile') || messageLower.includes('phone') || messageLower.includes('app')) {
    return '📱 **Mobile App (PWA):**\n\nSlabDash works on phones!\n\n**For you:**\n• Open SlabDash in mobile browser\n• Works like a native app\n• Fast and responsive\n\n**For customers:**\n• Send them portal link\n• They can **"Add to Home Screen"**\n• Portal becomes an app icon!\n• Check submissions anytime\n\n**iOS:** Share → Add to Home Screen\n**Android:** Menu → Add to Home Screen\n\nNo app store needed!';
  }

  // TROUBLESHOOTING
  if (messageLower.includes('not working') || messageLower.includes('broken') || messageLower.includes('error')) {
    return '🔧 **Troubleshooting:**\n\n**Common fixes:**\n1. **Refresh page** (Ctrl+F5 or Cmd+Shift+R)\n2. **Clear browser cache**\n3. **Check PSA API key** (if using PSA features)\n4. **Verify email settings** (if emails not sending)\n\n**Still stuck?**\n• Check Help page for guides\n• Contact support\n• Check status page for outages\n\nTell me what\'s not working and I\'ll help troubleshoot!';
  }

  // FRIENDLY GREETINGS
  if (messageLower.includes('hi') || messageLower.includes('hello') || messageLower.includes('hey') ||
      messageLower.includes('thanks') || messageLower.includes('thank you')) {
    return '👋 Hey there! Happy to help! What would you like to know about SlabDash? I can explain any feature or walk you through tasks step-by-step! 😊';
  }

  // CATCH-ALL - More helpful than before
  return '🤔 **Great question!** I can help you with:\n\n• **Submissions** - Create, edit, track, refresh\n• **Emails** - Send updates, previews, welcome emails\n• **Customers** - Add, manage, portal access\n• **Cards** - Import CSV, add cards, grades\n• **PSA Integration** - API setup, auto-refresh\n• **Settings** - Email config, subscriptions\n\n**Try asking:**\n• "How do I add a submission?"\n• "How do I send email updates?"\n• "How do customers track their cards?"\n• "How do I import cards from PSA?"\n• "How do I set up PSA API?"\n\nWhat specific task do you need help with? 😊';
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
