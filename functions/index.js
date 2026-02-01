/**
 * Firebase Cloud Functions Entry Point
 * 
 * This file exports all Cloud Functions for the Fire Extinguisher Tracker
 */

const createCheckoutSession = require('./createCheckoutSession');
const handleStripeWebhook = require('./webhookHandler');

exports.createCheckoutSession = createCheckoutSession.createCheckoutSession;
exports.handleStripeWebhook = handleStripeWebhook.handleStripeWebhook;
