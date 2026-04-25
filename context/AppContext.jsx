import { createContext, useContext, useState, useCallback, useRef } from "react";
import { getAuth } from "../utils/authStorage";
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
      }
    } catch {}
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
      if (data.success) { setPets(data.pets || []); loaded.current.pets = true; }
    } catch {}
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
      if (data.success) { setAppointments(data.data || []); loaded.current.appointments = true; }
    } catch {}
  }, [loadAuth]);

  const loadWallet = useCallback(async (force = false) => {
    if (loaded.current.wallet && !force) return;
    try {
      const { token: t } = await loadAuth();
      const res = await fetch(`${BASE_URL}/api/v1/wallet`, { headers: { Authorization: t || "" } });
      const data = await res.json();
      if (data.success) { setWallet(data.wallet); loaded.current.wallet = true; }
    } catch {}
  }, [loadAuth]);

  const loadBoarding = useCallback(async (force = false) => {
    if (loaded.current.boarding && !force) return;
    try {
      const { token: t } = await loadAuth();
      const res = await fetch(`${BASE_URL}/api/v1/boarding-subscription/dashboard`, { headers: { Authorization: t || "" } });
      const data = await res.json();
      if (data.success) { setBoarding(data.dashboard || null); loaded.current.boarding = true; }
    } catch {}
  }, [loadAuth]);

  const loadPrescriptions = useCallback(async (force = false) => {
    if (loaded.current.prescriptions && !force) return;
    try {
      const { token: t } = await loadAuth();
      const res = await fetch(`${BASE_URL}/api/v1/prescription/myprescriptions`, { headers: { Authorization: t || "" } });
      const data = await res.json();
      if (data.success) { setPrescriptions(data.data || []); loaded.current.prescriptions = true; }
    } catch {}
  }, [loadAuth]);

  const resetCache = useCallback(() => {
    loaded.current = {
      auth: false, services: false, pets: false,
      appointments: false, wallet: false, boarding: false, prescriptions: false,
    };
    setUser(null); setToken(null); setServices([]); setPets([]);
    setAppointments([]); setWallet(null); setBoarding(null); setPrescriptions([]);
  }, []);

  return (
    <AppContext.Provider value={{
      user, token, services, pets, appointments, bookings: appointments, wallet, boarding, prescriptions,
      setUser, setToken, setPets, setAppointments, setWallet, setBoarding, setPrescriptions,
      loadAuth, loadServices, loadPets, loadAppointments, loadWallet, loadBoarding, loadPrescriptions,
      resetCache,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
