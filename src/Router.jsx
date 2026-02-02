import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import FeaturesPage from './pages/FeaturesPage';
import PricingPage from './pages/PricingPage';
import AboutPage from './pages/AboutPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import App from './App';
import Login from './Login';

/**
 * Main Router Component
 *
 * Routes:
 * - Marketing pages (/, /features, /pricing, /about, /terms, /privacy) - Public pages
 * - /app - The main fire extinguisher tracker application
 */

const Router = () => {
  return (
    <Routes>
      {/* Public Marketing Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />

      {/* Login page - for share links */}
      <Route path="/login" element={<Login />} />

      {/* Main Application */}
      <Route path="/app/*" element={<App />} />

      {/* Catch all - redirect to landing page */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default Router;
