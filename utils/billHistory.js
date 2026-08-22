import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "walkin_bill_history";

export const saveBill = async (bill) => {
  try {
    const existing = await loadBills();
    const updated = [bill, ...existing];
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch (e) {
    __DEV__ && console.log("saveBill error:", e);
  }
};

export const loadBills = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const deleteBill = async (billNo) => {
  try {
    const existing = await loadBills();
    const updated = existing.filter((b) => b.billNo !== billNo);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch (e) {
    __DEV__ && console.log("deleteBill error:", e);
  }
};
