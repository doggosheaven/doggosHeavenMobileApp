import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
  isErrorWithCode,
} from "@react-native-google-signin/google-signin";

// Configure once at module load.
// webClientId  -> "Web application" OAuth client ID from Google Cloud Console (REQUIRED).
// iosClientId  -> "iOS" OAuth client ID (needed for iOS native sign-in).
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  offlineAccess: false,
  profileImageSize: 120,
});

// Opens the native Google account picker and returns a fresh ID token,
// or null if the user cancels. Throws for real errors.
export async function getGoogleIdToken() {
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
