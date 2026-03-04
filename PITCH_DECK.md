# SlabDash - Business Pitch Deck

---

## What Is SlabDash?

SlabDash is software for **card grading shops** -- businesses that send sports cards and trading cards to PSA (Professional Sports Authenticator) for grading. These shops need to:

- Track dozens or hundreds of customer orders through PSA's multi-step process
- Keep customers updated on where their cards are
- Manage invoices, buyback offers, and email communications
- Look up card values and grading data

SlabDash does all of this in one place, with an AI assistant named **SAM** that knows PSA grading inside and out.

---

## Who Pays Us?

Card shop owners pay a **monthly subscription** via Stripe:

| Plan | Price | What They Get |
|------|-------|---------------|
| **Starter** | **$29/month** | 100 submissions/month, core features |
| **Professional** | **$79/month** | Unlimited submissions, all features, priority support |
| **Enterprise** | **Custom pricing** | Multi-location, API access, dedicated support |

Stripe takes **2.9% + $0.30** per charge (industry standard). So on a $79 charge, Stripe keeps ~$2.59, we keep ~$76.41.

---

## What Does It Cost Us to Run?

Here's every service that powers SlabDash, broken into three tiers based on how many shop customers we have.

### Tier 1: Getting Started (1-10 shops)

*Where we are now. Mostly free tiers.*

| Service | What It Does | Monthly Cost |
|---------|-------------|-------------|
| **Railway** | Runs the backend server + database | **$5-10** |
| **Vercel** | Hosts the website customers see | **$0** (free tier) |
| **SendGrid** | Sends emails (status updates, invoices) | **$0** (100 free/day) |
| **Cloudinary** | Stores card photos uploaded by shops | **$0** (25 GB free) |
| **Anthropic (Claude AI)** | Powers SAM, the AI assistant | **$5-15** |
| **Google Vision** | Reads text from card photos (scanner) | **$0** (1,000 free/month) |
| **eBay API** | Looks up current card prices | **$0** (free under 5K calls/day) |
| **PSA API** | Pulls grading status automatically | **$0** (free with PSA account) |
| **Stripe** | Processes payments | **2.9% + $0.30/charge** |
| | | |
| **Total fixed costs** | | **~$10-25/month** |

**Revenue at 10 shops (mix of Starter + Pro):**
- 5 Starter ($29) + 5 Pro ($79) = **$540/month**
- Minus Stripe fees (~$16) = **$524/month**
- Minus infrastructure (~$25) = **~$499/month profit**

---

### Tier 2: Growing (10-50 shops)

*Some free tiers get exceeded. Still very manageable.*

| Service | What It Does | Monthly Cost |
|---------|-------------|-------------|
| **Railway** | More traffic, bigger database | **$20-40** |
| **Vercel** | More visitors, may need Pro plan | **$0-20** |
| **SendGrid** | Sending 1,000+ emails/month | **$0-20** |
| **Cloudinary** | More photos being stored | **$0-45** |
| **Anthropic (Claude AI)** | More shops chatting with SAM | **$20-50** |
| **Google Vision** | More card scans | **$5-15** |
| **eBay API** | More price lookups | **$0** |
| **PSA API** | Still free per-shop | **$0** |
| **Stripe** | More transactions | **2.9% + $0.30/charge** |
| | | |
| **Total fixed costs** | | **~$50-190/month** |

**Revenue at 30 shops:**
- 10 Starter ($29) + 15 Pro ($79) + 5 Enterprise ($149 est.) = **$2,220/month**
- Minus Stripe fees (~$66) = **$2,154/month**
- Minus infrastructure (~$120) = **~$2,034/month profit**

---

### Tier 3: Scaling Up (50-200+ shops)

*Real business. Need reliable paid plans for everything.*

| Service | What It Does | Monthly Cost |
|---------|-------------|-------------|
| **Railway** | High-availability server, large database | **$50-100** |
| **Vercel** | Pro plan for performance | **$20** |
| **SendGrid** | 10,000+ emails/month | **$20-50** |
| **Cloudinary** | Thousands of card images | **$99-200** |
| **Anthropic (Claude AI)** | Heavy SAM usage across all shops | **$50-150** |
| **Google Vision** | Thousands of card scans | **$15-45** |
| **eBay API** | High volume lookups | **$0-10** |
| **PSA API** | Still free | **$0** |
| **Stripe** | High volume | **2.9% + $0.30/charge** |
| | | |
| **Total fixed costs** | | **~$250-575/month** |

**Revenue at 100 shops:**
- 25 Starter ($29) + 50 Pro ($79) + 25 Enterprise ($149 est.) = **$8,400/month**
- Minus Stripe fees (~$252) = **$8,148/month**
- Minus infrastructure (~$400) = **~$7,748/month profit**

---

## The Big Picture: Revenue vs. Costs

```
Shops     Monthly Revenue     Monthly Costs     Monthly Profit     Profit Margin
-----     ---------------     -------------     --------------     -------------
5         $270                ~$20              ~$250              ~93%
10        $540                ~$25              ~$515              ~95%
25        $1,475              ~$80              ~$1,395            ~95%
50        $3,225              ~$175             ~$3,050            ~95%
100       $8,400              ~$400             ~$8,000            ~95%
200       $16,800             ~$575             ~$16,225           ~97%
```

**Key takeaway: Software businesses have 90-97% profit margins because costs don't scale nearly as fast as revenue.**

At **100 shops**, we'd bring in about **$100,000/year** with only **$5,000/year in costs**.

---

## What Each Service Actually Does (Plain English)

| Service | Plain English |
|---------|--------------|
| **Railway** | The computer in the cloud that runs our app 24/7. Think of it as renting a server. |
| **Vercel** | Serves the website to users' browsers. Like the storefront window. |
| **PostgreSQL** | The database -- a giant organized filing cabinet that stores all shop data. |
| **Stripe** | Handles credit card payments. We never touch card numbers, Stripe does it all safely. |
| **SendGrid** | Sends emails on behalf of shops (order updates, invoices, etc). Like a digital mailroom. |
| **Cloudinary** | Stores all the card photos shops upload. Like a photo album in the cloud. |
| **Claude AI (Anthropic)** | The brain behind SAM, our AI assistant. It understands card grading and can analyze card images. |
| **Google Vision** | Reads text from card photos -- like a camera that can read. Used for the card scanner feature. |
| **eBay API** | Checks what cards are selling for on eBay right now. Free price data. |
| **PSA API** | Connects directly to PSA's system to auto-check order status. No manual checking needed. |
| **Web Push** | Sends notifications to phones/browsers. Free, built into all modern browsers. |

---

## What Makes SlabDash Valuable

1. **Saves shops 5-10 hours/week** manually checking PSA status and emailing customers
2. **SAM AI** gives instant expert grading advice -- no other tool in this market has this
3. **Customer portal** -- each shop's customers can check their own order status (less phone calls)
4. **Card scanner** -- take a photo, get a grade estimate and market price instantly
5. **Price comparisons** -- pull live eBay + TCG prices in seconds

---

## Market Size

- There are **1,000+ card grading shops** in the US alone
- The sports card market was valued at **$30+ billion** in 2024
- PSA grades **millions of cards per year** and the number grows annually
- No other SaaS product specifically targets this workflow

**If we capture just 5% of the market (50 shops), that's $50,000+/year in recurring revenue with minimal costs.**

---

## Current Status

| Item | Status |
|------|--------|
| Backend API | Live on Railway |
| Frontend | Live on Vercel |
| Stripe billing | Fully integrated |
| Email system | Working (SendGrid) |
| SAM AI assistant | Working (Claude) |
| PSA auto-refresh | Working (with smart rate limiting) |
| Card scanner | Working (Google Vision + Claude) |
| Customer portal | Working |
| Price comparisons | Working (eBay + JustTCG) |

**The product is built and running. We need customers.**

---

## Next Steps

1. **Onboard 5-10 beta shops** at discounted rates to get feedback
2. **Market to PSA-authorized dealers** (most likely to have volume)
3. **Content marketing** -- YouTube tutorials, Reddit presence in card collecting communities
4. **Referral program** -- shops refer other shops for a discount

---

## Summary for Decision Makers

- **It costs us $10-25/month to run right now**
- **Each paying shop brings $29-79+/month**
- **Break-even happens with just 1 paying customer**
- **At 50 shops: ~$3,000/month profit**
- **At 100 shops: ~$8,000/month profit**
- **Margins stay above 90% at any scale**
- **The product is already built and live**
- **No competitors in this specific niche**

The question isn't whether this makes money -- it's how fast we can get shops signed up.
