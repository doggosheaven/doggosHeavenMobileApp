/**
 * Google Sign-In, guarded so the app still runs where the native module is absent.
 *
 * @react-native-google-signin ships a native module (RNGoogleSignin) that Expo Go
 * does not bundle. Importing it at the top level made the whole module throw during
 * evaluation, which took down every screen that imported it — the login and signup
 * routes ended up with no default export at all. Loading it defensively means Expo
 * Go simply hides the Google button while real builds keep it.
 */

let GoogleSignin = null;
let statusCodes = {};
let isSuccessResponse = () => false;
let isErrorWithCode = () => false;
let available = false;

try {
  const mod = require("@react-native-google-signin/google-signin");
  // Touching the native module is what throws, so probe it before committing.
  if (mod?.GoogleSignin?.configure) {
    mod.GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      offlineAccess: false,
      profileImageSize: 120,
    });
    GoogleSignin = mod.GoogleSignin;
    statusCodes = mod.statusCodes || {};
    isSuccessResponse = mod.isSuccessResponse || (() => false);
    isErrorWithCode = mod.isErrorWithCode || (() => false);
    available = true;
  }
} catch (e) {
  if (__DEV__) {
    console.log("Google Sign-In unavailable in this runtime:", e?.message);
  }
}

export const isGoogleSignInAvailable = () => available;

/**
 * Opens the native Google account picker and returns a fresh ID token,
 * or null if the user cancels. Throws for real errors.
 */
export async function getGoogleIdToken() {
  if (!available) {
    throw new Error("Google Sign-In needs a development or production build.");
  }

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  // Sign out first so the account picker always shows (avoids silent stale session).
  try { await GoogleSignin.signOut(); } catch (_) {}

  const response = await GoogleSignin.signIn();
  if (isSuccessResponse(response)) {
    const idToken = response.data?.idToken;
    if (!idToken) throw new Error("Google did not return an ID token.");
    return idToken;
  }
  // response.type === "cancelled"
  return null;
}

export { statusCodes, isErrorWithCode };
