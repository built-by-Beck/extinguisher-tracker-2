# Project Setup Complete ✅

## What's Been Done

### ✅ Firebase Project Created
- **Project ID**: `extinguisher-tracker-2`
- **Project Name**: Extinguisher Tracker SaaS
- **Console**: https://console.firebase.google.com/project/extinguisher-tracker-2/overview

### ✅ Firebase Configuration Updated
- Updated `src/firebase.js` with new project config
- Updated `.firebaserc` to use `extinguisher-tracker-2` as default
- Created web app: `1:190749542107:web:14ffb776339ffba965eefe`

### ✅ Firestore Database
- Firestore database created and initialized
- Firestore security rules deployed (including subscription rules)
- Database location: nam5 (North America)

### ✅ Cloud Functions Setup
- Functions directory configured
- Dependencies installed (stripe, firebase-admin, firebase-functions)
- Functions added to `firebase.json`
- Ready to deploy once Stripe keys are configured

## Next Steps

### 1. Enable Authentication Methods

Go to [Firebase Console > Authentication](https://console.firebase.google.com/project/extinguisher-tracker-2/authentication/providers) and enable:

- ✅ **Email/Password** - Required for user sign-up and login
- ✅ **Anonymous** - Required for guest access (if you want to keep that feature)

### 2. Configure Stripe Keys

```bash
# Set your Stripe secret key (get from Stripe Dashboard)
firebase functions:config:set stripe.secret_key="sk_live_YOUR_SECRET_KEY"

# After setting up webhook, set the webhook secret
firebase functions:config:set stripe.webhook_secret="whsec_YOUR_WEBHOOK_SECRET"
```

### 3. Deploy Cloud Functions

```bash
firebase deploy --only functions
```

After deployment, you'll get URLs like:
- `createCheckoutSession`: https://YOUR_REGION-extinguisher-tracker-2.cloudfunctions.net/createCheckoutSession
- `handleStripeWebhook`: https://YOUR_REGION-extinguisher-tracker-2.cloudfunctions.net/handleStripeWebhook

### 4. Set Up Stripe Webhook

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://YOUR_REGION-extinguisher-tracker-2.cloudfunctions.net/handleStripeWebhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the signing secret and set it in Firebase (step 2)

### 5. Test the Application

1. Build the app: `npm run build`
2. Test locally or deploy to hosting
3. Create a test account
4. Try upgrading subscription
5. Verify subscription updates in Firestore

## Current Configuration

### Firebase Project
- **Project ID**: `extinguisher-tracker-2`
- **API Key**: `AIzaSyCnU2KuYWaI3mnlZ-aalyM-IrKTvb3ePfE`
- **Auth Domain**: `extinguisher-tracker-2.firebaseapp.com`
- **Storage Bucket**: `extinguisher-tracker-2.firebasestorage.app`

### Stripe Products (Already Configured)
- **Basic Plan**: `price_1SmEmxAzoOtBRx5SyYlwccrZ` ($29/month)
- **Pro Plan**: `price_1SmEp2AzoOtBRx5Sn7pRMVwy` ($79/month)

## Important Notes

- The subscription code is fully integrated and ready
- All Firestore rules are deployed
- Cloud Functions are ready to deploy (just need Stripe keys)
- The app will work with the new project once authentication is enabled

## Quick Commands

```bash
# Check current project
firebase use

# Deploy everything
firebase deploy

# Deploy only functions
firebase deploy --only functions

# Deploy only Firestore rules
firebase deploy --only firestore:rules

# View function logs
firebase functions:log
```
