import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearSessionCaches } from "./sessionCache";
import { BASE_URL } from "../constants/api";

export const saveAuth = async (token, user) => {
  await AsyncStorage.setItem("authtoken", token);
  await AsyncStorage.setItem("user", JSON.stringify(user));
};

export const getAuth = async () => {
  const token = await AsyncStorage.getItem("authtoken");
  const user = await AsyncStorage.getItem("user");
  return { token, user: user ? JSON.parse(user) : null };
};

export const clearAuth = async () => {
  await AsyncStorage.removeItem("authtoken");
  await AsyncStorage.removeItem("user");
  // Drop in-memory screen caches too, else the next sign-in shows the old user's data.
  clearSessionCaches();
};

/**
 * Ask the server who this token belongs to and rewrite the stored user.
 *
 * The blob written at login was treated as the truth forever, so a role change
 * only took effect at the next sign-in: someone promoted to superadmin kept
 * landing on the admin dashboard, and a deactivated account kept its UI. Anything
 * that routes on role should await this first.
 *
 * Returns { token, user, status }:
 *   "ok"       — user is fresh, storage updated
 *   "invalid"  — token rejected or account deactivated; the session is cleared
 *   "offline"  — could not reach the server, stored user left alone
 *   "none"     — nothing was stored to begin with
 */
export const refreshSession = async () => {
  const { token, user } = await getAuth();
  if (!token) return { token: null, user: null, status: "none" };

  try {
    const res = await fetch(`${BASE_URL}/api/v1/auth/me`, {
      headers: { Authorization: token },
    });

    if (res.status === 401 || res.status === 403) {
      await clearAuth();
      return { token: null, user: null, status: "invalid" };
    }

    const json = await res.json();
    if (!json?.success || !json.user) {
      // Server reachable but unhappy — keep what we have rather than logging out.
      return { token, user, status: "offline" };
    }

    await saveAuth(token, json.user);
    return { token, user: json.user, status: "ok" };
  } catch {
    return { token, user, status: "offline" };
  }
};
