# Quick Start: Stripe Integration

## Prerequisites
- Firebase project set up
- Firebase CLI installed: `npm install -g firebase-tools`
- Stripe account with your products/prices already created ✅

## Step 1: Install Function Dependencies

```bash
cd functions
npm install
cd ..
```

## Step 2: Configure Stripe Keys

Get your Stripe keys from [Stripe Dashboard > Developers > API keys](https://dashboard.stripe.com/apikeys):

```bash
# Set your Stripe secret key (starts with sk_live_ or sk_test_)
firebase functions:config:set stripe.secret_key="sk_live_YOUR_SECRET_KEY"
```

## Step 3: Deploy Cloud Functions

```bash
firebase deploy --only functions
```

After deployment, note the function URLs:
- `createCheckoutSession`: https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/createCheckoutSession
- `handleStripeWebhook`: https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/handleStripeWebhook

## Step 4: Set Up Stripe Webhook

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter your webhook URL: `https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/handleStripeWebhook`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Copy the **"Signing secret"** (starts with `whsec_`)

## Step 5: Configure Webhook Secret

```bash
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET"
firebase deploy --only functions
```

## Step 6: Test the Integration

1. **Test in your app:**
   - Log in to your app
   - Go to Menu > Subscription & Billing
   - Click "Upgrade to Pro" or "Upgrade to Basic"
   - You should be redirected to Stripe Checkout

2. **Test with Stripe test cards:**
   - Use card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any CVC
   - Complete the checkout

3. **Verify subscription update:**
   - After successful payment, check Firestore `subscriptions` collection
   - Your user document should have `tier: 'pro'` (or 'basic')
   - Check Stripe Dashboard to see the subscription

## Troubleshooting

### Function not found
- Make sure you deployed: `firebase deploy --only functions`
- Check function logs: `firebase functions:log`

### Webhook not working
- Verify webhook secret is set correctly
- Check webhook logs in Stripe Dashboard
- Check Firebase function logs for errors

### Subscription not updating
- Verify webhook is receiving events (check Stripe Dashboard)
- Check Firestore security rules allow writes (they should be restricted to backend only)
- Check function logs for errors

## Your Stripe Products (Already Configured)

- **Basic Plan**: `price_1SmEmxAzoOtBRx5SyYlwccrZ` ($29/month)
- **Pro Plan**: `price_1SmEp2AzoOtBRx5Sn7pRMVwy` ($79/month)

These are already configured in `src/services/stripeService.js` ✅

## Next Steps

- Test the full subscription flow
- Set up email notifications (optional)
- Configure customer portal for subscription management (optional)
- Add analytics tracking for subscription events (optional)
