# Subscription System Setup Guide

## Overview

The Fire Extinguisher Tracker has been transformed into a SaaS application with 3 subscription tiers:

- **Basic**: $29/month - Up to 50 extinguishers, inspections only, manual entry
- **Pro**: $79/month - Up to 500 extinguishers, barcode scanning, all features
- **Enterprise**: Custom pricing - Unlimited extinguishers, all features, custom support

## What's Been Implemented

✅ Subscription context and tier management
✅ Feature gating (barcode scanning disabled for Basic tier)
✅ Extinguisher count limits (50 for Basic, 500 for Pro, unlimited for Enterprise)
✅ Subscription management UI
✅ Pricing page updated
✅ Tier-based UI restrictions

## What You Need to Complete

### 1. Stripe Price IDs Already Configured ✅

Your Stripe Price IDs are already configured in `src/services/stripeService.js`:
- **Basic Plan**: `price_1SmEmxAzoOtBRx5SyYlwccrZ` ($29/month)
- **Pro Plan**: `price_1SmEp2AzoOtBRx5Sn7pRMVwy` ($79/month)

These match your Stripe products:
- Basic: `prod_TjiCd64pgwuAKq` - Extinguisher Tracker Basic Plan
- Pro: `prod_TjiFRjQtOnBbDe` - Extinguisher Tracker Pro Plan

### 2. Deploy Firebase Cloud Functions

The backend API is already created as Firebase Cloud Functions. You just need to deploy them:

**Step 1: Install dependencies**
```bash
cd functions
npm install
```

**Step 2: Set Stripe configuration**
```bash
# Set your Stripe secret key (get from Stripe Dashboard)
firebase functions:config:set stripe.secret_key="sk_live_YOUR_SECRET_KEY"

# For webhook verification, get webhook secret from Stripe Dashboard
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET"
```

**Step 3: Deploy functions**
```bash
firebase deploy --only functions
```

**Step 4: Set environment variable (optional)**
If you want to customize the frontend URL, set it in Firebase:
```bash
firebase functions:config:set frontend.url="https://extinguishertracker.com"
```

### 3. Set Up Stripe Webhooks

The webhook handler is already implemented in `functions/webhookHandler.js`. After deploying the functions:

**Step 1: Get your webhook endpoint URL**
After deploying, you'll get a URL like:
```
https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/handleStripeWebhook
```

**Step 2: Add webhook endpoint in Stripe Dashboard**
1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your function URL
4. Select these events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the "Signing secret" (starts with `whsec_`)
6. Set it in Firebase: `firebase functions:config:set stripe.webhook_secret="whsec_..."`

**Step 3: Redeploy functions**
```bash
firebase deploy --only functions
```

### 5. Update Firestore Security Rules

Add rules to allow users to read their own subscription:

```javascript
match /subscriptions/{userId} {
  allow read: if request.auth != null && request.auth.uid == userId;
  allow write: if false; // Only allow writes via backend/webhooks
}
```

### 4. Handle Post-Checkout Redirect (Optional)

The webhook handler automatically updates subscriptions when checkout completes. However, you can add a success message in App.jsx:

```javascript
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const success = params.get('success');
  
  if (success === 'true') {
    // Subscription will be updated via webhook
    // Show a success message
    alert('Subscription activated! Thank you for upgrading. Your account will be updated shortly.');
    // Clean up URL
    navigate('/app', { replace: true });
  }
}, [location.search, navigate]);
```

**Note**: The webhook handler automatically updates the subscription in Firestore, so the user's tier will be updated within a few seconds of successful payment.

## Testing

1. Test Basic tier restrictions:
   - Try to use barcode scanner (should be disabled)
   - Try to create more than 50 extinguishers (should show limit message)

2. Test Pro tier:
   - Upgrade to Pro (via subscription manager)
   - Verify barcode scanning works
   - Verify can create up to 500 extinguishers

3. Test Enterprise:
   - Click "Contact Sales" button
   - Should open email client

## Notes

- All new users default to Basic tier
- Subscription data is stored in Firestore `subscriptions` collection
- Tier limits are enforced in real-time
- Barcode scanning is automatically disabled for Basic tier users

## Support

For questions or issues, contact: support@extinguishertracker.com
