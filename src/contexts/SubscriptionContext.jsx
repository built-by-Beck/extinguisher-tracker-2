import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

// Subscription tier definitions
export const SUBSCRIPTION_TIERS = {
  BASIC: 'basic',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
};

export const TIER_LIMITS = {
  [SUBSCRIPTION_TIERS.BASIC]: {
    name: 'Basic',
    extinguisherLimit: 50,
    barcodeScanning: false,
    features: ['inspections', 'manual_entry']
  },
  [SUBSCRIPTION_TIERS.PRO]: {
    name: 'Pro',
    extinguisherLimit: 500,
    barcodeScanning: true,
    features: ['inspections', 'manual_entry', 'barcode_scanning', 'photos', 'gps', 'export']
  },
  [SUBSCRIPTION_TIERS.ENTERPRISE]: {
    name: 'Enterprise',
    extinguisherLimit: 10000, // Effectively unlimited
    barcodeScanning: true,
    features: ['inspections', 'manual_entry', 'barcode_scanning', 'photos', 'gps', 'export', 'api', 'custom_branding']
  }
};

export const SubscriptionProvider = ({ children }) => {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load subscription data
        const subscriptionRef = doc(db, 'subscriptions', currentUser.uid);
        const unsubscribeSubscription = onSnapshot(subscriptionRef, (snap) => {
          if (snap.exists()) {
            setSubscription(snap.data());
          } else {
            // Default to Basic tier if no subscription exists
            setSubscription({
              tier: SUBSCRIPTION_TIERS.BASIC,
              status: 'active',
              createdAt: new Date().toISOString()
            });
          }
          setLoading(false);
        }, (error) => {
          console.error('Error loading subscription:', error);
          // Default to Basic on error
          setSubscription({
            tier: SUBSCRIPTION_TIERS.BASIC,
            status: 'active',
            createdAt: new Date().toISOString()
          });
          setLoading(false);
        });
        return () => unsubscribeSubscription();
      } else {
        setSubscription(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const updateSubscription = async (tier, stripeData = {}) => {
    if (!user) return;

    try {
      const subscriptionRef = doc(db, 'subscriptions', user.uid);
      await setDoc(subscriptionRef, {
        tier,
        status: 'active',
        updatedAt: new Date().toISOString(),
        ...stripeData
      }, { merge: true });
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  };

  const getCurrentTier = () => {
    if (!subscription) return SUBSCRIPTION_TIERS.BASIC;
    return subscription.tier || SUBSCRIPTION_TIERS.BASIC;
  };

  const getTierLimits = () => {
    const tier = getCurrentTier();
    return TIER_LIMITS[tier] || TIER_LIMITS[SUBSCRIPTION_TIERS.BASIC];
  };

  const canUseBarcodeScanning = () => {
    const limits = getTierLimits();
    return limits.barcodeScanning === true;
  };

  const canCreateExtinguisher = async (currentCount) => {
    const limits = getTierLimits();
    return currentCount < limits.extinguisherLimit;
  };

  const getExtinguisherLimit = () => {
    const limits = getTierLimits();
    return limits.extinguisherLimit;
  };

  const value = {
    subscription,
    loading,
    tier: getCurrentTier(),
    tierLimits: getTierLimits(),
    updateSubscription,
    canUseBarcodeScanning,
    canCreateExtinguisher,
    getExtinguisherLimit,
    SUBSCRIPTION_TIERS,
    TIER_LIMITS
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
