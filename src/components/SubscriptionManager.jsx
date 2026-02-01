import React, { useState, useEffect } from 'react';
import { useSubscription, SUBSCRIPTION_TIERS, TIER_LIMITS } from '../contexts/SubscriptionContext';
import { CreditCard, Check, X, Mail, Phone, Crown, Zap, Shield } from 'lucide-react';
import { createCheckoutSession, STRIPE_PRICE_IDS } from '../services/stripeService';
import { auth } from '../firebase';

const SubscriptionManager = ({ onClose }) => {
  const { subscription, tier, tierLimits, updateSubscription } = useSubscription();
  const [loading, setLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  const handleUpgrade = async (targetTier) => {
    if (targetTier === SUBSCRIPTION_TIERS.ENTERPRISE) {
      // Enterprise requires contact
      window.location.href = 'mailto:sales@extinguishertracker.com?subject=Enterprise Plan Inquiry';
      return;
    }

    setStripeLoading(true);
    try {
      // Get the price ID for the target tier
      const priceId = targetTier === SUBSCRIPTION_TIERS.BASIC 
        ? STRIPE_PRICE_IDS.BASIC 
        : STRIPE_PRICE_IDS.PRO;
      
      // Get current user ID from auth
      const userId = auth.currentUser?.uid;
      if (!userId) {
        alert('Please log in to upgrade your subscription.');
        return;
      }
      
      // Create Stripe checkout session
      // This will call your backend API to create a secure checkout session
      await createCheckoutSession(priceId, userId, targetTier);
      
      // Note: The checkout session creation should redirect the user to Stripe
      // After successful payment, Stripe will send a webhook to your backend
      // Your backend should then update the subscription in Firestore
      
    } catch (error) {
      console.error('Error initiating upgrade:', error);
      alert('Error initiating upgrade. Please try again.');
    } finally {
      setStripeLoading(false);
    }
  };

  const currentTierIndex = Object.values(SUBSCRIPTION_TIERS).indexOf(tier);
  const isBasic = tier === SUBSCRIPTION_TIERS.BASIC;
  const isPro = tier === SUBSCRIPTION_TIERS.PRO;
  const isEnterprise = tier === SUBSCRIPTION_TIERS.ENTERPRISE;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Subscription & Billing
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        {/* Current Plan */}
        <div className="mb-8">
          <div className={`p-6 rounded-lg border-2 ${
            isBasic ? 'border-gray-300 bg-gray-50' :
            isPro ? 'border-blue-500 bg-blue-50' :
            'border-purple-500 bg-purple-50'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Current Plan: {tierLimits.name}
                </h3>
                <p className="text-gray-600 mt-1">
                  {isEnterprise ? 'Custom pricing' : 'Active subscription'}
                </p>
              </div>
              {isBasic && <Shield className="h-8 w-8 text-gray-500" />}
              {isPro && <Zap className="h-8 w-8 text-blue-500" />}
              {isEnterprise && <Crown className="h-8 w-8 text-purple-500" />}
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-sm text-gray-600">Extinguisher Limit</p>
                <p className="text-lg font-semibold">
                  {tierLimits.extinguisherLimit === 10000 ? 'Unlimited' : tierLimits.extinguisherLimit}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Barcode Scanning</p>
                <p className="text-lg font-semibold">
                  {tierLimits.barcodeScanning ? (
                    <span className="text-green-600">Enabled</span>
                  ) : (
                    <span className="text-gray-400">Disabled</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Available Plans */}
        <div className="mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Available Plans</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Basic Plan */}
            <div className={`border-2 rounded-lg p-6 ${
              isBasic ? 'border-gray-400 bg-gray-100' : 'border-gray-200'
            }`}>
              <div className="text-center mb-4">
                <h4 className="text-lg font-bold text-gray-900">Basic</h4>
                <p className="text-2xl font-bold text-gray-900 mt-2">$29</p>
                <p className="text-sm text-gray-600">/month</p>
              </div>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Up to 50 extinguishers
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Inspections only
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Manual number entry
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <X className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400">Barcode scanning</span>
                </li>
              </ul>
              {isBasic ? (
                <button
                  disabled
                  className="w-full bg-gray-300 text-gray-600 py-2 rounded-lg cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(SUBSCRIPTION_TIERS.BASIC)}
                  disabled={stripeLoading}
                  className="w-full bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
                >
                  {stripeLoading ? 'Processing...' : 'Downgrade to Basic'}
                </button>
              )}
            </div>

            {/* Pro Plan */}
            <div className={`border-2 rounded-lg p-6 ${
              isPro ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
            }`}>
              <div className="text-center mb-4">
                <h4 className="text-lg font-bold text-gray-900">Pro</h4>
                <p className="text-2xl font-bold text-gray-900 mt-2">$79</p>
                <p className="text-sm text-gray-600">/month</p>
              </div>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Up to 500 extinguishers
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Everything in Basic
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="font-semibold">Barcode scanning</span>
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Photos & GPS tracking
                </li>
              </ul>
              {isPro ? (
                <button
                  disabled
                  className="w-full bg-blue-300 text-blue-800 py-2 rounded-lg cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(SUBSCRIPTION_TIERS.PRO)}
                  disabled={stripeLoading}
                  className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {stripeLoading ? 'Processing...' : isBasic ? 'Upgrade to Pro' : 'Switch to Pro'}
                </button>
              )}
            </div>

            {/* Enterprise Plan */}
            <div className={`border-2 rounded-lg p-6 ${
              isEnterprise ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
            }`}>
              <div className="text-center mb-4">
                <h4 className="text-lg font-bold text-gray-900">Enterprise</h4>
                <p className="text-2xl font-bold text-gray-900 mt-2">Custom</p>
                <p className="text-sm text-gray-600">Contact for pricing</p>
              </div>
              <ul className="space-y-2 mb-4">
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Unlimited extinguishers
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Everything in Pro
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Custom features
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  Dedicated support
                </li>
              </ul>
              {isEnterprise ? (
                <button
                  disabled
                  className="w-full bg-purple-300 text-purple-800 py-2 rounded-lg cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(SUBSCRIPTION_TIERS.ENTERPRISE)}
                  className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <Mail size={16} />
                  Contact Sales
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Billing Information */}
        {subscription?.stripeCustomerId && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Billing Information</h4>
            <p className="text-sm text-gray-600">
              Customer ID: {subscription.stripeCustomerId}
            </p>
            {subscription.stripeSubscriptionId && (
              <p className="text-sm text-gray-600">
                Subscription ID: {subscription.stripeSubscriptionId}
              </p>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Need help?</strong> Contact us at{' '}
            <a href="mailto:support@extinguishertracker.com" className="underline">
              support@extinguishertracker.com
            </a>
            {' '}or call{' '}
            <a href="tel:+1234567890" className="underline">
              (123) 456-7890
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionManager;
