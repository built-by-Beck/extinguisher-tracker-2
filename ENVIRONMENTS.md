# Environment Configuration Guide

This project supports multiple environments (development, staging, production) to allow testing features before deploying to production.

## Two Approaches

### Option 1: Multiple Web Apps in Same Project (Recommended - Easier!)

You can add multiple web apps to the same Firebase project:
- **Development App**: For local testing
- **Staging App**: For pre-production testing  
- **Production App**: For live application

**How to set it up:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `fire-extinguisher-tracke-9e98f`
3. Click the gear icon → Project Settings
4. Scroll to "Your apps" section
5. Click "Add app" → Web (</>) icon
6. Name it (e.g., "Development", "Staging", "Production")
7. Copy the config values into your `.env` files

**Benefits:**
- ✅ Same Firebase project, same billing
- ✅ Easier to manage
- ✅ Can share some data if needed
- ✅ Simpler setup

**Note:** Each app will have different `appId` but same project settings (auth, firestore, storage rules apply to all)

### Option 2: Separate Firebase Projects

Create completely separate Firebase projects:
- `fire-extinguisher-tracke-9e98f-dev`
- `fire-extinguisher-tracke-9e98f-staging`
- `fire-extinguisher-tracke-9e98f` (production)

**Benefits:**
- ✅ Complete isolation
- ✅ Different billing quotas
- ✅ Can't accidentally affect production data

## Setup (Recommended: Multiple Apps)

### 1. Create Environment Files

Copy the example file and fill in your Firebase app credentials:

```bash
# For development
cp .env.example .env.development

# For staging (optional)
cp .env.example .env.staging

# For production
cp .env.example .env.production
```

### 2. Add Web Apps in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click gear icon → Project Settings
4. Scroll to "Your apps" section
5. Click "Add app" → Web (</>) for each environment:
   - **Development**: Name it "Development" or "Dev"
   - **Staging**: Name it "Staging" (optional)
   - **Production**: Use existing app or create "Production"

### 3. Fill in Credentials

For each `.env.*` file, use the config from the corresponding web app:

**Development App Config:**
```env
VITE_FIREBASE_PROJECT_ID=fire-extinguisher-tracke-9e98f
VITE_FIREBASE_API_KEY=<dev-app-api-key>
VITE_FIREBASE_AUTH_DOMAIN=fire-extinguisher-tracke-9e98f.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=fire-extinguisher-tracke-9e98f.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1068945798281
VITE_FIREBASE_APP_ID=<dev-app-id>
VITE_FIREBASE_MEASUREMENT_ID=<dev-measurement-id>
VITE_ENV=development
```

**Production App Config:**
```env
VITE_FIREBASE_PROJECT_ID=fire-extinguisher-tracke-9e98f
VITE_FIREBASE_API_KEY=<prod-app-api-key>
VITE_FIREBASE_AUTH_DOMAIN=fire-extinguisher-tracke-9e98f.firebaseapp.com
VITE_FIREBASE_STORAGE_BUCKET=fire-extinguisher-tracke-9e98f.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1068945798281
VITE_FIREBASE_APP_ID=<prod-app-id>
VITE_FIREBASE_MEASUREMENT_ID=<prod-measurement-id>
VITE_ENV=production
```

**Note:** `projectId`, `authDomain`, `storageBucket`, and `messagingSenderId` will be the same for all apps in the same project. Only `apiKey` and `appId` will differ.

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
   - Uses development web app in Firebase
   - Safe to test experimental features
   - Same Firestore/Storage as production (be careful with data)

2. **Staging**: Test before production with `npm run dev:staging`
   - Uses staging web app in Firebase
   - Test with production-like data
   - Verify features work correctly

3. **Production**: Deploy to production with `npm run build`
   - Uses production web app in Firebase
   - Only deploy after staging tests pass

## Important Notes

### Data Isolation
⚠️ **Warning**: When using multiple apps in the same project, they share the same:
- Firestore database
- Storage bucket
- Authentication users
- Security rules

**To isolate data:**
- Use different user accounts for testing
- Use workspace/userId filtering in your app
- Or use separate Firebase projects (Option 2)

### Authentication Setup

For each environment, make sure:
1. **Anonymous Authentication** is enabled (for guest access)
2. **Email/Password** authentication is enabled
3. Security rules are deployed: `firebase deploy --only firestore:rules`

### Environment Variables

All environment variables are prefixed with `VITE_` to be accessible in the browser.

Required variables:
- `VITE_FIREBASE_PROJECT_ID` (same for all apps in project)
- `VITE_FIREBASE_API_KEY` (different per app)
- `VITE_FIREBASE_AUTH_DOMAIN` (same for all apps in project)
- `VITE_FIREBASE_STORAGE_BUCKET` (same for all apps in project)
- `VITE_FIREBASE_MESSAGING_SENDER_ID` (same for all apps in project)
- `VITE_FIREBASE_APP_ID` (different per app)
- `VITE_FIREBASE_MEASUREMENT_ID` (different per app, optional)
- `VITE_ENV` (optional, defaults to 'development')

## Security Notes

- ⚠️ Never commit `.env` files to git (already in `.gitignore`)
- ✅ Commit `.env.example` file for reference
- ✅ Use different web apps for each environment
- ✅ Keep production credentials secure
- ⚠️ Remember: All apps share the same Firestore/Storage data

## Troubleshooting

### Environment not loading?
- Make sure the `.env.*` file exists
- Check that variable names start with `VITE_`
- Restart the dev server after changing `.env` files

### Wrong Firebase project?
- Check which `.env` file is being used
- Verify `VITE_ENV` matches the mode you're running
- Check console logs for the active project ID

### Data mixing between environments?
- Use different user accounts for dev/staging/production
- Or create separate Firebase projects for complete isolation
