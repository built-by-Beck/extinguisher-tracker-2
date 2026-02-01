# How to Enable Anonymous Authentication in Firebase

## Steps:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **fire-extinguisher-tracke-9e98f**
3. Click on **Authentication** in the left sidebar
4. Click on the **Sign-in method** tab
5. Scroll down and find **Anonymous** in the list of providers
6. Click on **Anonymous**
7. Toggle **Enable** to ON
8. Click **Save**

## Why This is Needed:

The guest access feature uses Firebase's Anonymous Authentication to allow users to view shared data without creating an account. This is a secure way to provide read-only access to your fire extinguisher tracking data.

## After Enabling:

Once anonymous authentication is enabled, users will be able to:
- Click "Continue as Guest" on the login page
- Enter a share code (Owner UID)
- View the shared data in read-only mode

The error "auth/admin-restricted-operation" will be resolved once this is enabled.
