/**
 * Firebase Cloud Function to handle Stripe Webhooks
 * 
 * This function processes Stripe webhook events to update subscriptions in Firestore
 * 
 * Deploy: firebase deploy --only functions:handleStripeWebhook
 * 
 * Set webhook endpoint in Stripe Dashboard:
 * https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/handleStripeWebhook
 * 
 * Events to listen for:
 * - checkout.session.completed
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

exports.handleStripeWebhook = functions.https.onRequest(async (req, res) => {
  // Get Stripe configuration
  const stripeSecretKey = functions.config().stripe?.secret_key;
  const webhookSecret = functions.config().stripe?.webhook_secret;
  
  if (!stripeSecretKey || !webhookSecret) {
    console.error('Stripe configuration missing');
    return res.status(500).json({ error: 'Server configuration error' });
  }
  
  const stripe = require('stripe')(stripeSecretKey);
  
  const sig = req.headers['stripe-signature'];

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.client_reference_id || session.metadata?.userId;
        const tier = session.metadata?.tier || 'basic';

        if (userId && session.mode === 'subscription') {
          await admin.firestore()
            .collection('subscriptions')
            .doc(userId)
            .set({
              tier: tier,
              status: 'active',
              stripeCustomerId: session.customer,
              stripeSubscriptionId: session.subscription,
              stripeCheckoutSessionId: session.id,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              subscriptionStartDate: admin.firestore.Timestamp.fromDate(new Date())
            }, { merge: true });

          console.log(`Subscription activated for user ${userId}, tier: ${tier}`);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Find user by customer ID
        const subscriptionDocs = await admin.firestore()
          .collection('subscriptions')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();

        if (!subscriptionDocs.empty) {
          const userId = subscriptionDocs.docs[0].id;
          const tier = subscription.metadata?.tier || 'basic';

          await admin.firestore()
            .collection('subscriptions')
            .doc(userId)
            .set({
              tier: tier,
              status: subscription.status,
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscription.id,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              subscriptionCurrentPeriodEnd: admin.firestore.Timestamp.fromMillis(
                subscription.current_period_end * 1000
              )
            }, { merge: true });

          console.log(`Subscription ${event.type} for user ${userId}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Find user by customer ID
        const subscriptionDocs = await admin.firestore()
          .collection('subscriptions')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get();

        if (!subscriptionDocs.empty) {
          const userId = subscriptionDocs.docs[0].id;

          await admin.firestore()
            .collection('subscriptions')
            .doc(userId)
            .set({
              status: 'canceled',
              tier: 'basic', // Downgrade to basic
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              subscriptionCanceledAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

          console.log(`Subscription canceled for user ${userId}`);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const customerId = invoice.customer;
          
          const subscriptionDocs = await admin.firestore()
            .collection('subscriptions')
            .where('stripeCustomerId', '==', customerId)
            .limit(1)
            .get();

          if (!subscriptionDocs.empty) {
            const userId = subscriptionDocs.docs[0].id;
            
            await admin.firestore()
              .collection('subscriptions')
              .doc(userId)
              .set({
                status: 'active',
                lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              }, { merge: true });

            console.log(`Payment succeeded for user ${userId}`);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          const customerId = invoice.customer;
          
          const subscriptionDocs = await admin.firestore()
            .collection('subscriptions')
            .where('stripeCustomerId', '==', customerId)
            .limit(1)
            .get();

          if (!subscriptionDocs.empty) {
            const userId = subscriptionDocs.docs[0].id;
            
            await admin.firestore()
              .collection('subscriptions')
              .doc(userId)
              .set({
                status: 'past_due',
                lastPaymentFailedDate: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
              }, { merge: true });

            console.log(`Payment failed for user ${userId}`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
});
