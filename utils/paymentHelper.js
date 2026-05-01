import { Alert } from "react-native";

// Razorpay removed — manual payment flow
export async function initiatePayment({ serviceName, onRefresh }) {
  Alert.alert(
    "⏳ Payment Awaiting",
    `Please coordinate with our staff to complete the payment for ${serviceName || "this service"}.\n\nVisit the clinic or contact us directly.`,
    [{ text: "OK", onPress: () => onRefresh?.() }]
  );
}
