/**
 * Stripe Service
 * 
 * This service handles Stripe checkout session creation via Firebase Cloud Functions.
 * 
 * The checkout session is created securely on the backend using a Firebase Cloud Function.
 * See functions/createCheckoutSession.js for the backend implementation.
 */

// Get the Firebase Cloud Function URL
// Replace with your actual function URL after deployment
const CLOUD_FUNCTION_URL = process.env.VITE_STRIPE_FUNCTION_URL || 
  'https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/createCheckoutSession';

export const createCheckoutSession = async (priceId, userId, tier) => {
  try {
    // Import Firebase functions if available, otherwise use fetch
    let createCheckoutSessionFunction;
    
    try {
      // Try to use Firebase Functions SDK if available
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      createCheckoutSessionFunction = httpsCallable(functions, 'createCheckoutSession');
      
      // Call the Cloud Function
      const result = await createCheckoutSessionFunction({ priceId, tier });
      const { url } = result.data;
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (sdkError) {
      // Fallback to HTTP call if SDK not available
      console.log('Using HTTP fallback for checkout session creation');
      
      // Get Firebase auth token for authenticated request
      const { auth } = await import('../firebase');
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('User must be authenticated');
      }
      
      const token = await user.getIdToken();
      
      const response = await fetch(CLOUD_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ priceId, tier })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create checkout session');
      }
      
      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    }
  } catch (error) {
    console.error('Error creating checkout session:', error);
    alert(`Error creating checkout session: ${error.message}\n\nPlease try again or contact support.`);
    throw error;
  }
};

/**
 * Price IDs for your Stripe products
 * These are your actual Stripe Price IDs from your Stripe account
 */
export const STRIPE_PRICE_IDS = {
  BASIC: 'price_1SmEmxAzoOtBRx5SyYlwccrZ', // Basic Plan - $29/month
  PRO: 'price_1SmEp2AzoOtBRx5Sn7pRMVwy'      // Pro Plan - $79/month
};

export const STRIPE_PRODUCT_IDS = {
  BASIC: 'prod_TjiCd64pgwuAKq', // Extinguisher Tracker Basic Plan
  PRO: 'prod_TjiFRjQtOnBbDe'      // Extinguisher Tracker Pro Plan
};
