import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { getAuth } from "../utils/authStorage";
import { registerCacheReset } from "../utils/sessionCache";
import { BASE_URL } from "../constants/api";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const StaffContext = createContext(null);

export function StaffProvider({ children }) {
  const [appointments, setAppointments] = useState([]);
  const [inventory, setInventory]       = useState([]);
  const [alertList, setAlertList]       = useState([]);
  const [token, setToken]               = useState("");
  const [user, setUser]                 = useState(null);
  const [errors, setErrors]             = useState({});
  const fail = (key, yes) => setErrors((p) => (p[key] === yes ? p : { ...p, [key]: yes }));

  const loaded = useRef({ appointments: false, inventory: false });
  const lastApptCount = useRef(null);
  const tokenRef = useRef("");

  // Booking sound alert
  const triggerBookingAlert = useCallback(async (count) => {
    try {
      // Vibration — Rapido/Ola style
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 400);
      setTimeout(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), 800);

      // Local notification with sound
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 New Booking!",
          body: `${count} new booking${count > 1 ? "s" : ""} received`,
          sound: "default",
          ...(Platform.OS === "android" && { channelId: "booking_alert" }),
        },
        trigger: null, // immediate
      });
    } catch {}
  }, []);

  // Poll for new bookings every 15 seconds.
  // Only the count is needed to decide whether to buzz, so ask for the count —
  // this used to download every appointment in the database four times a minute.
  useEffect(() => {
    const poll = async () => {
      try {
        const { token: t, user: u } = await getAuth();
        if (!u || u.role !== "staff") return;
        tokenRef.current = t || "";
        const res = await fetch(`${BASE_URL}/api/v1/customerappointment/summary?limit=1`, {
          headers: { Authorization: tokenRef.current },
        });
        const data = await res.json();
        if (!data.success) return;
        const newCount = data.total || 0;
        if (lastApptCount.current !== null && newCount > lastApptCount.current) {
          triggerBookingAlert(newCount - lastApptCount.current);
          // Let the next visit to the bookings screen pull the full list.
          loaded.current.appointments = false;
        }
        lastApptCount.current = newCount;
      } catch {}
    };
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [triggerBookingAlert]);

  const loadAuth = useCallback(async () => {
    const { token: t, user: u } = await getAuth();
    setToken(t || ""); setUser(u);
    return { token: t || "", user: u };
  }, []);

  const loadAppointments = useCallback(async (force = false) => {
    if (loaded.current.appointments && !force) return;
    try {
      const { token: t } = await loadAuth();
      const res = await fetch(`${BASE_URL}/api/v1/customerappointment/getallappoint`, {
        headers: { Authorization: t },
      });
      const data = await res.json();
      if (data.success) { setAppointments(data.data || []); loaded.current.appointments = true; fail("appointments", false); }
      else fail("appointments", true);
    } catch { fail("appointments", true); }
  }, [loadAuth]);

  const loadInventory = useCallback(async (force = false) => {
    if (loaded.current.inventory && !force) return;
    try {
      const { token: t } = await loadAuth();
      const [invRes, alertRes] = await Promise.all([
        fetch(`${BASE_URL}/api/v1/inventory/getallinventory`, { headers: { Authorization: t } }),
        fetch(`${BASE_URL}/api/v1/inventory/getalertlist`, { headers: { Authorization: t } }),
      ]);
      const invJson   = await invRes.json();
      const alertJson = await alertRes.json();
      if (invJson.success)   { setInventory(invJson.items || []); }
      if (alertJson.success) { setAlertList(alertJson.items || alertJson.alertList || []); }
      loaded.current.inventory = true;
      fail("inventory", false);
    } catch { fail("inventory", true); }
  }, [loadAuth]);

  const resetStaffCache = useCallback(() => {
    loaded.current = { appointments: false, inventory: false };
    setAppointments([]); setInventory([]); setAlertList([]);
    setToken(""); setUser(null); setErrors({});
  }, []);

  // Same automatic wiring as AppContext, so logging out clears staff data even
  // from a code path that forgets to call resetStaffCache by hand.
  useEffect(() => registerCacheReset(resetStaffCache), [resetStaffCache]);

  return (
    <StaffContext.Provider value={{
      appointments, setAppointments,
      inventory, setInventory,
      alertList, setAlertList,
      token, setToken, user, setUser,
      loadAuth, loadAppointments, loadInventory,
      resetStaffCache, errors,
    }}>
      {children}
    </StaffContext.Provider>
  );
}

export const useStaff = () => useContext(StaffContext);
