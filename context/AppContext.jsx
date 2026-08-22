import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { getAuth } from "../utils/authStorage";
import { registerCacheReset } from "../utils/sessionCache";
import { BASE_URL } from "../constants/api";

const AppContext = createContext(null);

const EXCLUDED = ["Buy Subscription", "Shop", "Inquiry"];

export function AppProvider({ children }) {
  const [user, setUser]                   = useState(null);
  const [token, setToken]                 = useState(null);
  const [services, setServices]           = useState([]);
  const [pets, setPets]                   = useState([]);
  const [appointments, setAppointments]   = useState([]);
  const [wallet, setWallet]               = useState(null);
  const [boarding, setBoarding]           = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);

  // Which loads failed, so screens can say so instead of rendering an empty page.
  const [errors, setErrors] = useState({});
  const fail = (key, yes) => setErrors((p) => (p[key] === yes ? p : { ...p, [key]: yes }));

  const loaded = useRef({
    auth: false, services: false, pets: false,
    appointments: false, wallet: false, boarding: false, prescriptions: false,
  });

  const loadAuth = useCallback(async (force = false) => {
    if (loaded.current.auth && !force) {
      const { user: u, token: t } = await getAuth();
      return { user: u, token: t };
    }
    const { user: u, token: t } = await getAuth();
    setUser(u); setToken(t);
    loaded.current.auth = true;
    return { user: u, token: t };
  }, []);

  const loadServices = useCallback(async (force = false) => {
    if (loaded.current.services && !force) return;
    try {
      const { token: t } = await loadAuth();
      const res = await fetch(`${BASE_URL}/api/v1/visit/getallvisittypes`, { headers: { Authorization: t || "" } });
      const data = await res.json();
      if (data.success) {
        setServices(data.visitTypes.filter((s) => !EXCLUDED.includes(s.purpose)));
        loaded.current.services = true;
        fail("services", false);
      } else fail("services", true);
    } catch { fail("services", true); }
  }, [loadAuth]);

  const loadPets = useCallback(async (force = false) => {
    if (loaded.current.pets && !force) return;
    try {
      const { user: u, token: t } = await loadAuth();
      if (!u?.email) return;
      const res = await fetch(
        `${BASE_URL}/api/v1/customerappointment/getcustomerpets?email=${encodeURIComponent(u.email)}`,
        { headers: { Authorization: t || "" } }
      );
      const data = await res.json();
      if (data.success) { setPets(data.pets || []); loaded.current.pets = true; fail("pets", false); }
      else fail("pets", true);
    } catch { fail("pets", true); }
  }, [loadAuth]);

  const loadAppointments = useCallback(async (force = false) => {
    if (loaded.current.appointments && !force) return;
    try {
      const { user: u, token: t } = await loadAuth();
      if (!u?.id) return;
      const res = await fetch(
        `${BASE_URL}/api/v1/customerappointment/getcustomerappoint/${u.id}`,
        { headers: { Authorization: t || "" } }
      );
      const data = await res.json();
      if (data.success) { setAppointments(data.data || []); loaded.current.appointments = true; fail("appointments", false); }
      else fail("appointments", true);
    } catch { fail("appointments", true); }
  }, [loadAuth]);

  const loadWallet = useCallback(async (force = false) => {
    if (loaded.current.wallet && !force) return;
    try {
      const { token: t } = await loadAuth();
      const res = await fetch(`${BASE_URL}/api/v1/wallet`, { headers: { Authorization: t || "" } });
      const data = await res.json();
      if (data.success) { setWallet(data.wallet); loaded.current.wallet = true; fail("wallet", false); }
      else fail("wallet", true);
    } catch { fail("wallet", true); }
  }, [loadAuth]);

  const loadBoarding = useCallback(async (force = false) => {
    if (loaded.current.boarding && !force) return;
    try {
      const { token: t } = await loadAuth();
      const res = await fetch(`${BASE_URL}/api/v1/boarding-subscription/dashboard`, { headers: { Authorization: t || "" } });
      const data = await res.json();
      if (data.success) { setBoarding(data.dashboard || null); loaded.current.boarding = true; fail("boarding", false); }
      else fail("boarding", true);
    } catch { fail("boarding", true); }
  }, [loadAuth]);

  const loadPrescriptions = useCallback(async (force = false) => {
    if (loaded.current.prescriptions && !force) return;
    try {
      const { token: t } = await loadAuth();
      const res = await fetch(`${BASE_URL}/api/v1/prescription/myprescriptions`, { headers: { Authorization: t || "" } });
      const data = await res.json();
      if (data.success) { setPrescriptions(data.data || []); loaded.current.prescriptions = true; fail("prescriptions", false); }
      else fail("prescriptions", true);
    } catch { fail("prescriptions", true); }
  }, [loadAuth]);

  const resetCache = useCallback(() => {
    loaded.current = {
      auth: false, services: false, pets: false,
      appointments: false, wallet: false, boarding: false, prescriptions: false,
    };
    setUser(null); setToken(null); setServices([]); setPets([]);
    setAppointments([]); setWallet(null); setBoarding(null); setPrescriptions([]);
    setErrors({});
  }, []);

  // clearAuth() runs every registered resetter. Without this the provider — which
  // lives above the router and never unmounts — kept the previous customer's pets,
  // bookings and wallet balance on screen for whoever signed in next.
  useEffect(() => registerCacheReset(resetCache), [resetCache]);

  return (
    <AppContext.Provider value={{
      user, token, services, pets, appointments, bookings: appointments, wallet, boarding, prescriptions,
      setUser, setToken, setPets, setAppointments, setWallet, setBoarding, setPrescriptions,
      loadAuth, loadServices, loadPets, loadAppointments, loadWallet, loadBoarding, loadPrescriptions,
      resetCache, errors,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
