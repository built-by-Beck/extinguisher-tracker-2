# Environment Configuration Guide

This project supports multiple environments (development, staging, production) to allow testing features before deploying to production.

## Setup

### 1. Create Environment Files

Copy the example files and fill in your Firebase project credentials:

```bash
# For development
cp .env.development.example .env.development

# For staging
cp .env.staging.example .env.staging

# For production
cp .env.production.example .env.production
```

### 2. Fill in Firebase Credentials

Edit each `.env.*` file with the appropriate Firebase project credentials:

- **Development**: Use a separate Firebase project for local testing
- **Staging**: Use a staging Firebase project for pre-production testing
- **Production**: Use your production Firebase project

### 3. Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (gear icon)
4. Scroll down to "Your apps" section
5. Click on the web app (or create one)
6. Copy the config values into your `.env` file

## Running Different Environments

### Development (default)
```bash
npm run dev
```
Uses `.env.development` file

### Staging
```bash
npm run dev:staging
```
Uses `.env.staging` file

### Production (local preview)
```bash
npm run dev:prod
```
Uses `.env.production` file

## Building for Different Environments

### Development Build
```bash
npm run build:dev
```

### Staging Build
```bash
npm run build:staging
```

### Production Build
```bash
npm run build
```

## Recommended Workflow

1. **Development**: Work on features locally with `npm run dev`
   - Uses development Firebase project
   - Safe to test experimental features
   - No impact on production data

2. **Staging**: Test before production with `npm run dev:staging`
   - Uses staging Firebase project
   - Test with production-like data
   - Verify features work correctly

3. **Production**: Deploy to production with `npm run build`
   - Uses production Firebase project
   - Only deploy after staging tests pass

## Firebase Projects Setup

### Creating Separate Firebase Projects

1. **Development Project**:
   - Create: `fire-extinguisher-tracke-9e98f-dev`
   - Use for: Local development and testing
   - Enable: Anonymous auth, Email/Password auth

2. **Staging Project**:
   - Create: `fire-extinguisher-tracke-9e98f-staging`
   - Use for: Pre-production testing
   - Enable: Same features as production

3. **Production Project**:
   - Existing: `fire-extinguisher-tracke-9e98f`
   - Use for: Live application
   - Enable: All required features

### Setting Up Each Project

For each Firebase project:

1. Enable Authentication methods:
   - Email/Password
   - Anonymous (for guest access)

2. Set up Firestore:
   - Copy `firestore.rules` to each project
   - Deploy rules: `firebase deploy --only firestore:rules --project <project-id>`

3. Set up Storage:
   - Configure storage rules if needed

## Environment Variables

All environment variables are prefixed with `VITE_` to be accessible in the browser.

Required variables:
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional)
- `VITE_ENV` (optional, defaults to 'development')

## Security Notes

- ⚠️ Never commit `.env` files to git (already in `.gitignore`)
- ✅ Commit `.env.example` files for reference
- ✅ Use different Firebase projects for each environment
- ✅ Keep production credentials secure

## Troubleshooting

### Environment not loading?
- Make sure the `.env.*` file exists
- Check that variable names start with `VITE_`
- Restart the dev server after changing `.env` files

### Wrong Firebase project?
- Check which `.env` file is being used
- Verify `VITE_ENV` matches the mode you're running
- Check console logs for the active project ID
