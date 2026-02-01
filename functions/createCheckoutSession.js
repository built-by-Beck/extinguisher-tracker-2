/**
 * Firebase Cloud Function to create Stripe Checkout Sessions
 * 
 * Deploy this function to Firebase:
 * 1. Install dependencies: cd functions && npm install
 * 2. Set Stripe secret key: firebase functions:config:set stripe.secret_key="sk_live_..."
 * 3. Deploy: firebase deploy --only functions:createCheckoutSession
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  // Get Stripe secret key from config
  const stripeSecretKey = functions.config().stripe?.secret_key;
  if (!stripeSecretKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Stripe secret key not configured. Run: firebase functions:config:set stripe.secret_key="sk_..."'
    );
  }
  
  const stripe = require('stripe')(stripeSecretKey);
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated to create checkout session'
    );
  }

  const { priceId, tier } = data;
  const userId = context.auth.uid;
  const userEmail = context.auth.token.email;

  if (!priceId || !tier) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'priceId and tier are required'
    );
  }

  try {
    // Get the base URL from the request or environment
    const baseUrl = process.env.FRONTEND_URL || 'https://extinguishertracker.com';
    
    // Create or get Stripe customer
    let customerId;
    const subscriptionDoc = await admin.firestore()
      .collection('subscriptions')
      .doc(userId)
      .get();
    
    if (subscriptionDoc.exists && subscriptionDoc.data().stripeCustomerId) {
      customerId = subscriptionDoc.data().stripeCustomerId;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          userId: userId,
          firebaseUID: userId
        }
      });
      customerId = customer.id;
      
      // Save customer ID to Firestore
      await admin.firestore()
        .collection('subscriptions')
        .doc(userId)
        .set({
          stripeCustomerId: customerId,
          tier: 'basic', // Default tier
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/app?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${baseUrl}/app?canceled=true`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
        tier: tier,
        firebaseUID: userId
      },
      subscription_data: {
        metadata: {
          userId: userId,
          tier: tier,
          firebaseUID: userId
        }
      },
      allow_promotion_codes: true, // Allow customers to use promo codes
    });

    return {
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to create checkout session',
      error.message
    );
  }
});
