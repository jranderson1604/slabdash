# Email Notifications Setup

Your SlabDash platform is ready for automated email notifications. Follow this guide to enable email alerts for customers and shop owners.

## 🎯 What Gets Emailed

Once configured, SlabDash will automatically send emails for:

✅ **Customer Portal Links** - When you generate a portal link for a customer
✅ **New Buyback Offers** - When you create a buyback offer for a customer
✅ **Buyback Responses** - When a customer accepts/declines an offer
✅ **Submission Updates** - When grades are ready or cards ship
✅ **Order Confirmations** - When new submissions are created

## 📧 Email Service Options

### Option 1: SendGrid (Recommended)

**Why SendGrid?**
- Free tier: 100 emails/day (perfect for getting started)
- Easy setup, reliable delivery
- Great analytics dashboard

**Setup Steps:**

1. **Create SendGrid Account**
   - Go to https://signup.sendgrid.com
   - Sign up for free account
   - Verify your email address

2. **Create API Key**
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name: "SlabDash Production"
   - Permissions: "Full Access"
   - Copy your API key (starts with `SG.`)

3. **Verify Sender Email**
   - Go to Settings → Sender Authentication
   - Click "Verify a Single Sender"
   - Enter your business email (e.g., support@yourdomain.com)
   - Check your inbox and verify

4. **Add to Railway**
   - Open: https://railway.com/project/23b6ca53-eb96-4302-9206-db0fc82b07af/service/7872e156-d674-4ee0-83fa-4d7776985132
   - Click **Variables** tab
   - Add these variables:

   ```
   SENDGRID_API_KEY=SG.your_api_key_here
   EMAIL_FROM=support@yourdomain.com
   EMAIL_FROM_NAME=Your Shop Name
   ```

### Option 2: Mailgun

**Why Mailgun?**
- Free tier: 5,000 emails/month
- Simple API, great for transactional emails

**Setup Steps:**

1. **Create Mailgun Account**
   - Go to https://signup.mailgun.com
   - Sign up for free account
   - Verify your email

2. **Get API Credentials**
   - Go to Settings → API Keys
   - Copy your "Private API key"
   - Go to Sending → Domains
   - Copy your sandbox domain OR add your own domain

3. **Add to Railway**
   - Open Railway project (link above)
   - Click **Variables** tab
   - Add these variables:

   ```
   MAILGUN_API_KEY=your_mailgun_api_key
   MAILGUN_DOMAIN=mg.yourdomain.com
   EMAIL_FROM=noreply@yourdomain.com
   EMAIL_FROM_NAME=Your Shop Name
   ```

### Option 3: Gmail SMTP (Quick Start)

**Why Gmail?**
- Free, no signup needed if you have Gmail
- Works immediately
- Limited to ~100 emails/day

**Setup Steps:**

1. **Enable App Password**
   - Go to https://myaccount.google.com/security
   - Enable 2-Factor Authentication (required)
   - Go to App Passwords
   - Create app password for "Mail"
   - Copy the 16-character password

2. **Add to Railway**
   - Open Railway project
   - Click **Variables** tab
   - Add these variables:

   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your.email@gmail.com
   SMTP_PASS=your_16_char_app_password
   EMAIL_FROM=your.email@gmail.com
   EMAIL_FROM_NAME=Your Shop Name
   ```

## 🔧 Email Configuration Variables

Here's what each variable does:

| Variable | Description | Example |
|----------|-------------|---------|
| `SENDGRID_API_KEY` | SendGrid API key | `SG.abc123...` |
| `MAILGUN_API_KEY` | Mailgun private API key | `key-abc123...` |
| `MAILGUN_DOMAIN` | Your Mailgun domain | `mg.example.com` |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `587` |
| `SMTP_USER` | SMTP username (email) | `you@gmail.com` |
| `SMTP_PASS` | SMTP password/app password | `abcd efgh ijkl mnop` |
| `EMAIL_FROM` | Sender email address | `noreply@yourdomain.com` |
| `EMAIL_FROM_NAME` | Sender display name | `Card Shop Pro` |

## 📬 Email Templates

SlabDash sends these emails automatically:

### 1. Customer Portal Link
**When**: You click "Generate Portal Link" on customer page
**To**: Customer email
**Subject**: Track Your Card Submissions
**Content**:
```
Hi [Customer Name],

You can track your card submissions here:
[Portal Link]

Click the link above to see real-time updates on your orders.

Thanks!
[Your Shop Name]
```

### 2. New Buyback Offer
**When**: You create a buyback offer for a card
**To**: Customer email
**Subject**: Buyback Offer for Your [Card Description]
**Content**:
```
Hi [Customer Name],

We'd like to make you an offer on your card:

Card: [Description] - Grade [X]
Offer: $[Amount]
Message: [Optional shop message]

View and respond: [Portal Link]

Thanks!
[Your Shop Name]
```

### 3. Buyback Response Notification
**When**: Customer accepts/declines offer
**To**: Shop owner email
**Subject**: Customer [Accepted/Declined] Buyback Offer
**Content**:
```
Customer [Name] has [accepted/declined] your buyback offer.

Card: [Description]
Offer: $[Amount]
Status: [Response]

View details: [Dashboard Link]
```

### 4. Grades Ready Notification
**When**: PSA grades are updated via API
**To**: Customer email
**Subject**: Your Card Grades Are Ready!
**Content**:
```
Hi [Customer Name],

Great news! Your cards have been graded:

[Card 1]: Grade [X]
[Card 2]: Grade [X]
...

View all grades: [Portal Link]

Thanks!
[Your Shop Name]
```

## 🚀 Testing Your Email Setup

### 1. Test Portal Link Email

1. Go to **Customers** page
2. Click on any customer
3. Enable "Portal Access" if not enabled
4. Click **Generate Portal Link**
5. Click **Email** button
6. Check customer's inbox

### 2. Test Buyback Offer Email

1. Go to any graded card with a customer assigned
2. Click **Create Buyback Offer**
3. Enter amount and message
4. Submit
5. Check customer's inbox

### 3. Check Email Logs

**SendGrid**: Dashboard → Email Activity
**Mailgun**: Logs → Email Events
**Gmail**: Sent folder

## ⚠️ Troubleshooting

### Emails Not Sending

**Check Railway Logs:**
```
1. Open Railway project
2. Click on your service
3. Click "Deployments" tab
4. Click latest deployment
5. Check logs for email errors
```

**Common Issues:**

❌ **"SENDGRID_API_KEY not configured"**
→ Add the API key to Railway environment variables

❌ **"Invalid sender email"**
→ Verify sender in SendGrid/Mailgun dashboard

❌ **"SMTP authentication failed"**
→ Check SMTP_USER and SMTP_PASS are correct
→ For Gmail, make sure you're using an App Password

❌ **"Emails going to spam"**
→ Add SPF/DKIM records to your domain (see provider docs)
→ Use your own domain instead of Gmail

### Emails Send But Don't Arrive

1. **Check Spam Folder** - First place to look
2. **Verify Email Address** - Make sure customer email is correct
3. **Check Send Limits** - Free tiers have daily limits
4. **Review Provider Logs** - Check SendGrid/Mailgun activity

## 📊 Monitoring Email Health

### SendGrid Dashboard
- Open: https://app.sendgrid.com
- View: Email Activity, Deliverability Stats
- See: Opens, clicks, bounces

### Mailgun Dashboard
- Open: https://app.mailgun.com
- View: Logs, Analytics
- See: Delivery status, errors

## 🎯 Production Best Practices

### Use Your Own Domain

Instead of Gmail, use a professional email like:
- `noreply@yourdomain.com`
- `orders@yourdomain.com`
- `support@yourdomain.com`

**Benefits:**
- More professional
- Better deliverability
- Higher sending limits
- Build your brand

### Set Up SPF and DKIM

Add these DNS records to improve deliverability:

**SendGrid:** Settings → Sender Authentication → Authenticate Domain
**Mailgun:** Sending → Domains → Add Domain → Follow DNS instructions

### Monitor Bounce Rates

If bounce rate > 5%, investigate:
- Are customer emails valid?
- Are emails going to spam?
- Do you need domain authentication?

## 🔗 Useful Links

- **SendGrid**: https://app.sendgrid.com
- **Mailgun**: https://app.mailgun.com
- **Railway Project**: https://railway.com/project/23b6ca53-eb96-4302-9206-db0fc82b07af
- **Gmail App Passwords**: https://myaccount.google.com/apppasswords

## 🎉 You're All Set!

Once you add the email environment variables to Railway:

1. ✅ Railway redeploys automatically (30 seconds)
2. ✅ Email notifications work instantly
3. ✅ Customers receive portal links via email
4. ✅ Buyback offers trigger email alerts
5. ✅ Grade updates notify customers

**No code changes needed** - just add the environment variables! 🚀

---

## 💡 Quick Start Recommendation

**For immediate testing:** Use Gmail SMTP (Option 3)
**For production:** Use SendGrid (Option 1)

Start with Gmail to test the feature, then upgrade to SendGrid when you're ready to scale.
