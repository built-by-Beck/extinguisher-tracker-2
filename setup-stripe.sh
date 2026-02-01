#!/bin/bash
# Script to set up Stripe configuration for Firebase Functions

echo "🔧 Setting up Stripe configuration for extinguisher-tracker-2"
echo ""

# Check if Stripe secret key is provided
if [ -z "$1" ]; then
    echo "❌ Error: Stripe secret key required"
    echo ""
    echo "Usage: ./setup-stripe.sh sk_live_YOUR_SECRET_KEY"
    echo ""
    echo "Get your Stripe secret key from:"
    echo "https://dashboard.stripe.com/apikeys"
    exit 1
fi

STRIPE_SECRET_KEY=$1

echo "✅ Setting Stripe secret key..."
firebase functions:config:set stripe.secret_key="$STRIPE_SECRET_KEY" --project extinguisher-tracker-2

echo ""
echo "⚠️  Note: Webhook secret will be set after:"
echo "   1. Functions are deployed (requires Blaze plan)"
echo "   2. Webhook is created in Stripe Dashboard"
echo "   3. Webhook signing secret is obtained"
echo ""
echo "To set webhook secret later, run:"
echo "   firebase functions:config:set stripe.webhook_secret=\"whsec_...\" --project extinguisher-tracker-2"
echo ""
