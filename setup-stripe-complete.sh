#!/bin/bash
# Complete Stripe setup script for extinguisher-tracker-2
# This script will:
# 1. Set Stripe secret key
# 2. Deploy Cloud Functions
# 3. Create Stripe webhook
# 4. Set webhook secret

set -e

PROJECT_ID="extinguisher-tracker-2"
STRIPE_SECRET_KEY="${1:-}"

if [ -z "$STRIPE_SECRET_KEY" ]; then
    echo "❌ Error: Stripe secret key required"
    echo ""
    echo "Usage: ./setup-stripe-complete.sh sk_live_YOUR_SECRET_KEY"
    echo ""
    echo "Get your Stripe secret key from:"
    echo "https://dashboard.stripe.com/apikeys"
    exit 1
fi

echo "🔧 Setting up Stripe for $PROJECT_ID"
echo ""

# Step 1: Set Stripe secret key
echo "📝 Step 1: Setting Stripe secret key..."
firebase functions:config:set stripe.secret_key="$STRIPE_SECRET_KEY" --project "$PROJECT_ID"
echo "✅ Stripe secret key configured"
echo ""

# Step 2: Deploy functions
echo "📦 Step 2: Deploying Cloud Functions..."
echo "⚠️  Note: This requires Blaze plan. If deployment fails, upgrade at:"
echo "   https://console.firebase.google.com/project/$PROJECT_ID/usage/details"
echo ""

if firebase deploy --only functions --project "$PROJECT_ID" 2>&1 | tee /tmp/functions-deploy.log; then
    echo "✅ Functions deployed successfully"
    
    # Extract webhook URL from deployment
    WEBHOOK_URL=$(grep -o "https://[^ ]*handleStripeWebhook" /tmp/functions-deploy.log | head -1)
    
    if [ -z "$WEBHOOK_URL" ]; then
        # Try alternative method to get URL
        REGION=$(grep -o "functions\[.*\]: https://[^/]*" /tmp/functions-deploy.log | head -1 | sed 's/.*https:\/\///' | cut -d'.' -f1)
        if [ -n "$REGION" ]; then
            WEBHOOK_URL="https://$REGION-$PROJECT_ID.cloudfunctions.net/handleStripeWebhook"
        fi
    fi
    
    if [ -n "$WEBHOOK_URL" ]; then
        echo ""
        echo "🌐 Webhook URL: $WEBHOOK_URL"
        echo ""
        echo "📋 Step 3: Create webhook in Stripe Dashboard:"
        echo "   1. Go to: https://dashboard.stripe.com/webhooks"
        echo "   2. Click 'Add endpoint'"
        echo "   3. Enter URL: $WEBHOOK_URL"
        echo "   4. Select events:"
        echo "      - checkout.session.completed"
        echo "      - customer.subscription.created"
        echo "      - customer.subscription.updated"
        echo "      - customer.subscription.deleted"
        echo "      - invoice.payment_succeeded"
        echo "      - invoice.payment_failed"
        echo "   5. Copy the 'Signing secret' (starts with whsec_)"
        echo ""
        echo "📝 Step 4: Set webhook secret:"
        echo "   firebase functions:config:set stripe.webhook_secret=\"whsec_...\" --project $PROJECT_ID"
        echo "   firebase deploy --only functions --project $PROJECT_ID"
        echo ""
    else
        echo "⚠️  Could not extract webhook URL. Please check deployment output above."
        echo "   Webhook URL should be: https://YOUR_REGION-$PROJECT_ID.cloudfunctions.net/handleStripeWebhook"
    fi
else
    echo ""
    echo "❌ Function deployment failed. Common reasons:"
    echo "   1. Project not on Blaze plan - Upgrade at:"
    echo "      https://console.firebase.google.com/project/$PROJECT_ID/usage/details"
    echo "   2. APIs not enabled - They should auto-enable, but check:"
    echo "      https://console.cloud.google.com/apis/library?project=$PROJECT_ID"
    echo ""
    echo "Once upgraded, run this script again."
    exit 1
fi

echo "✅ Setup complete! (Webhook secret still needs to be set manually)"
