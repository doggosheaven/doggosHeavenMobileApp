import { Alert } from "react-native";
import RazorpayCheckout from "react-native-razorpay";
import { BASE_URL } from "../constants/api";

const GST_ONLINE = 0.18;
const GST_CARD   = 0.20;

export const getGSTRate = (paymentMethod) => {
  if (!paymentMethod) return GST_ONLINE;
  const m = paymentMethod.toLowerCase();
  if (m.includes("cash")) return 0;
  if (m.includes("card")) return GST_CARD;
  return GST_ONLINE;
};

export const calcGST = (baseAmount, paymentMethod) => {
  const rate = getGSTRate(paymentMethod);
  const gst  = Math.round(baseAmount * rate);
  return { rate, gst, total: baseAmount + gst };
};

export async function initiatePayment({ appointmentId, amount, paymentMethod, serviceName, user, token, onSuccess, onRefresh }) {
  if (!amount || amount <= 0) {
    Alert.alert("No Amount", "This booking has no payment amount set. Please contact support.");
    return;
  }

  // GST-inclusive amount for Razorpay
  const { total: totalWithGST } = calcGST(amount, paymentMethod || "online");

  try {
    const orderRes = await fetch(`${BASE_URL}/api/v1/customerappointment/createpaymentorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token || "" },
      body: JSON.stringify({ appointmentId, amount: totalWithGST }),
    });
    const orderText = await orderRes.text();
    let orderData;
    try { orderData = JSON.parse(orderText); } catch { throw new Error("Could not create payment order."); }
    if (!orderData.success) throw new Error(orderData.message || "Could not create payment order");

    const orderId = orderData.order.id;
    const razorpayKey = orderData.key;

    const { gst, total } = calcGST(amount, paymentMethod || "online");
    const gstRate = getGSTRate(paymentMethod || "online");
    const gstPercent = Math.round(gstRate * 100);

    const options = {
      key: razorpayKey,
      order_id: orderId,
      amount: totalWithGST * 100,
      currency: "INR",
      name: "Doggos Heaven",
      description: `${serviceName || "Service"} | Base: ₹${amount} + GST ${gstPercent}%: ₹${gst} = ₹${total}`,
      prefill: {
        name: user?.fullName || user?.name || "",
        email: user?.email || "",
      },
    };

    // SDK returns payment IDs on success, throws on cancel/failure
    const paymentData = await RazorpayCheckout.open(options);

    // Verify payment on backend — this marks paymentStatus as "paid"
    const verifyRes = await fetch(`${BASE_URL}/api/v1/customerappointment/verifypayment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: token || "" },
      body: JSON.stringify({
        appointmentId,
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
      }),
    });
    const verifyData = await verifyRes.json();

    if (verifyData.success) {
      Alert.alert("Payment Successful! 🎉", `₹${total} paid (incl. GST ₹${gst}). Your booking is confirmed!`);
      onSuccess?.();
    } else {
      Alert.alert("Verification Failed", verifyData.message || "Payment received but verification failed. Contact support.");
      onRefresh?.();
    }
  } catch (e) {
    // User cancelled payment — no alert needed
    if (e?.code === 0 || e?.description === "Payment cancelled by user") return;
    Alert.alert("Error", e.message || "Something went wrong");
  }
}
