#!/bin/bash
# Complete Stripe setup - Run this after providing your Stripe secret key

set -e

PROJECT_ID="extinguisher-tracker-2"
WEBHOOK_URL="https://us-central1-extinguisher-tracker-2.cloudfunctions.net/handleStripeWebhook"

if [ -z "$1" ]; then
    echo "❌ Error: Stripe secret key required"
    echo ""
    echo "Usage: ./complete-stripe-setup.sh sk_live_YOUR_SECRET_KEY"
    echo ""
    echo "Get your Stripe secret key from:"
    echo "https://dashboard.stripe.com/apikeys"
    exit 1
fi

STRIPE_SECRET_KEY=$1

echo "🔧 Completing Stripe setup for $PROJECT_ID"
echo ""

# Step 1: Set Stripe secret key
echo "📝 Step 1: Setting Stripe secret key..."
firebase functions:config:set stripe.secret_key="$STRIPE_SECRET_KEY" --project "$PROJECT_ID"
echo "✅ Stripe secret key configured"
echo ""

# Step 2: Redeploy functions with the key
echo "📦 Step 2: Redeploying functions with Stripe key..."
firebase deploy --only functions --project "$PROJECT_ID" --force
echo "✅ Functions redeployed"
echo ""

# Step 3: Instructions for webhook
echo "🌐 Step 3: Create Stripe Webhook"
echo ""
echo "Webhook URL: $WEBHOOK_URL"
echo ""
echo "Go to: https://dashboard.stripe.com/webhooks"
echo "Click 'Add endpoint' and configure:"
echo ""
echo "  URL: $WEBHOOK_URL"
echo "  Events to listen for:"
echo "    - checkout.session.completed"
echo "    - customer.subscription.created"
echo "    - customer.subscription.updated"
echo "    - customer.subscription.deleted"
echo "    - invoice.payment_succeeded"
echo "    - invoice.payment_failed"
echo ""
echo "After creating the webhook, copy the 'Signing secret' (starts with whsec_)"
echo "Then run:"
echo "  firebase functions:config:set stripe.webhook_secret=\"whsec_...\" --project $PROJECT_ID"
echo "  firebase deploy --only functions --project $PROJECT_ID"
echo ""
echo "✅ Stripe secret key is set and functions are ready!"
echo "   Complete the webhook setup above to finish."
