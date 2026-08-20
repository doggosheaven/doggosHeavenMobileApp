import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearSessionCaches } from "./sessionCache";

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
