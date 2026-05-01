import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Asset } from "expo-asset";
import { Alert } from "react-native";

// GST constants — commented out for future use
// const GST_NO     = "06AAKCD6549A1ZR";
// const GST_ONLINE = 0.18;
// const GST_CARD   = 0.20;
const GST_NO = "06AAKCD6549A1ZR"; // kept for invoice display only

// const getGSTRate = (paymentMethod) => {
//   if (!paymentMethod) return GST_ONLINE;
//   const m = paymentMethod.toLowerCase();
//   if (m.includes("cash")) return 0;
//   if (m.includes("card")) return GST_CARD;
//   return GST_ONLINE;
// };

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtDateTime = () =>
  new Date().toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const fmt = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const getGSTRate = (paymentMethod) => {
  if (!paymentMethod) return GST_ONLINE;
  const m = paymentMethod.toLowerCase();
  if (m.includes("cash")) return 0;
  if (m.includes("card")) return GST_CARD;
  return GST_ONLINE;
};

const getGSTLabel = (paymentMethod) => {
  if (!paymentMethod) return "GST (18% - Online)";
  const m = paymentMethod.toLowerCase();
  if (m.includes("cash")) return "GST (0% - Cash)";
  if (m.includes("card")) return "GST (20% - Card)";
  return "GST (18% - Online)";
};

// Load logo as base64 at runtime
let _cachedLogo = null;
const getLogoBase64 = async () => {
  if (_cachedLogo) return _cachedLogo;
  try {
    const asset = Asset.fromModule(require("../assets/images/doggoswhite.png"));
    await asset.downloadAsync();
    const uri = asset.localUri || asset.uri;
    if (!uri) return null;
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64",
    });
    _cachedLogo = `data:image/png;base64,${base64}`;
    return _cachedLogo;
  } catch (e) {
    console.log("Logo load error:", e);
    return null;
  }
};

const buildHTML = (logoSrc, invoiceNo, billType, billDate, billTo, statusHtml, tableRows, subtotal, gstAmt, grandTotal, gstLabel, paymentMethod, extraInfo, notes, gstRate = 0) => `
<!DOCTYPE html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#1A1A1A;background:#fff;padding:28px;max-width:700px;margin:auto}
.top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
.brand-left{display:flex;flex-direction:column;gap:8px}
.brand-row{display:flex;align-items:center;gap:10px}
.brand-name{font-size:20px;font-weight:800;color:#0B3D2E;letter-spacing:1px}
.brand-sub{font-size:10px;color:#3E7B27;margin-top:2px}
.brand-contact{font-size:9px;color:#888;line-height:1.8}
.brand-right{text-align:right}
.inv-title{font-size:20px;font-weight:800;color:#0B3D2E;letter-spacing:3px}
.inv-no{font-size:12px;color:#666;margin-top:3px}
.inv-date{font-size:9px;color:#999;margin-top:2px}
.divider{height:2px;background:linear-gradient(90deg,#0B3D2E,#A8D96C);margin:16px 0;border-radius:2px}
.bill-row{display:flex;justify-content:space-between;margin-bottom:18px;gap:16px}
.bill-label{font-size:8px;font-weight:700;color:#3E7B27;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.bill-name{font-size:14px;font-weight:700;color:#0B3D2E}
.bill-detail{font-size:10px;color:#666;margin-top:2px}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
thead tr{background:#0B3D2E}
thead th{padding:9px 12px;text-align:left;font-size:9px;font-weight:700;color:#A8D96C;text-transform:uppercase;letter-spacing:1px}
thead th:last-child{text-align:right}
tbody tr{border-bottom:1px solid #E8F5E8}
tbody tr:nth-child(even){background:#F9FFF9}
tbody td{padding:10px 12px;font-size:11px;color:#333}
tbody td:last-child{text-align:right;font-weight:700;color:#0B3D2E}
.totals{margin-left:auto;width:240px}
.t-row{display:flex;justify-content:space-between;padding:5px 0;font-size:11px;color:#555;border-bottom:1px solid #f0f0f0}
.t-gst{display:flex;justify-content:space-between;padding:5px 0;font-size:11px;color:#B8860B;border-bottom:1px solid #f0f0f0;font-weight:700}
.t-grand{display:flex;justify-content:space-between;padding:10px 14px;background:#0B3D2E;border-radius:8px;margin-top:8px}
.t-grand span{font-size:15px;font-weight:800;color:#A8D96C}
.gst-note{margin-top:12px;padding:8px 12px;background:#FFF9E6;border-radius:8px;border-left:3px solid #F59E0B;font-size:9px;color:#B8860B}
.info-row{display:flex;gap:8px;margin-top:18px}
.info-box{flex:1;padding:10px;border-radius:8px;border:1px solid #D4EDD4;background:#F0F7F0}
.info-box-label{font-size:8px;font-weight:700;color:#3E7B27;text-transform:uppercase;letter-spacing:1px;margin-bottom:3px}
.info-box-val{font-size:12px;font-weight:700;color:#0B3D2E;text-transform:capitalize}
.notes-box{margin-top:14px;padding:10px 14px;background:#F0F7F0;border-radius:8px;border-left:3px solid #A8D96C}
.notes-label{font-size:8px;font-weight:700;color:#3E7B27;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.notes-txt{font-size:11px;color:#555}
.footer{margin-top:24px;padding-top:12px;border-top:1px solid #E8F5E8;display:flex;justify-content:space-between;align-items:flex-end}
.footer-note{font-size:9px;color:#999;line-height:1.8;max-width:260px}
.footer-brand{font-size:11px;font-weight:700;color:#0B3D2E;text-align:right}
.footer-url{font-size:9px;color:#3E7B27;text-align:right}
.wm{text-align:center;margin-top:14px;font-size:8px;color:#ddd;letter-spacing:2px;text-transform:uppercase}
</style></head><body>
<div class="top">
  <div class="brand-left">
    <div class="brand-row">
      ${logoSrc ? `<img src="${logoSrc}" width="80" height="80" style="border-radius:12px;display:block;object-fit:contain;background:#0B3D2E;padding:6px"/>` : `<div style="width:80px;height:80px;border-radius:12px;background:#0B3D2E;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;color:#A8D96C">DH</div>`}
      <div>
        <div class="brand-name">Doggos Heaven</div>
        <div class="brand-sub">Premium Pet Care &amp; Resort</div>
      </div>
    </div>
    <div class="brand-contact">care@doggosheaven.com &nbsp;|&nbsp; doggosheaven.com<br/>GSTIN: ${GST_NO}</div>
  </div>
  <div class="brand-right">
    <div class="inv-title">${billType}</div>
    <div class="inv-no"># ${invoiceNo}</div>
    <div class="inv-date">Date: ${billDate}</div>
    <div class="inv-date">Generated: ${fmtDateTime()}</div>
  </div>
</div>
<div class="divider"></div>
<div class="bill-row">
  <div>
    <div class="bill-label">Bill To</div>
    <div class="bill-name">${billTo.name}</div>
    ${billTo.detail1 ? `<div class="bill-detail">${billTo.detail1}</div>` : ""}
    ${billTo.detail2 ? `<div class="bill-detail">${billTo.detail2}</div>` : ""}
  </div>
  <div style="text-align:right">
    ${statusHtml}
  </div>
</div>
<table>${tableRows}</table>
<div class="totals">
  <div class="t-row"><span>Subtotal</span><span>&#8377;${fmt(subtotal)}</span></div>
  ${gstAmt > 0 ? `<div class="t-gst"><span>${gstLabel}</span><span>&#8377;${fmt(gstAmt)}</span></div>` : "<!-- GST disabled -->"}
  <div class="t-grand"><span>Total</span><span>&#8377;${fmt(grandTotal)}</span></div>
</div>
<div class="gst-note">GSTIN: ${GST_NO} &nbsp;|&nbsp; Payment Mode: ${paymentMethod || "Online"}</div>
${extraInfo ? `<div class="info-row">${extraInfo}</div>` : ""}
${notes ? `<div class="notes-box"><div class="notes-label">Notes</div><div class="notes-txt">${notes}</div></div>` : ""}
<div class="footer">
  <div class="footer-note">Thank you for choosing Doggos Heaven!<br/>For queries: care@doggosheaven.com<br/>This is a computer-generated invoice.</div>
  <div><div class="footer-brand">Doggos Heaven</div><div class="footer-url">doggosheaven.com</div></div>
</div>
<div class="wm">Doggos Heaven &bull; Premium Pet Care &bull; GSTIN: ${GST_NO}</div>
</body></html>`;

// ── Booking Invoice ───────────────────────────────────────────────────────────
export const buildInvoiceHTML = async (appt) => {
  const logoSrc = await getLogoBase64();
  const invoiceNo = `DH-${appt._id.slice(-8).toUpperCase()}`;
  const customerName = appt.customerId?.fullName || appt.customerId?.name || "Customer";
  const customerEmail = appt.customerId?.email || "";
  const paymentMethod = appt.paymentMethod || appt.paymentMode || "—";
  const grandTotal = appt.totalAmount || 0;
  const subtotal = grandTotal; // GST disabled
  // const gstAmt = appt.gstAmount > 0 ? appt.gstAmount : 0;
  // const subtotal = appt.totalAmount > 0 ? appt.totalAmount - gstAmt : 0;
  // const gstLabel = gstAmt > 0 ? getGSTLabel(paymentMethod) : "GST (0%)";
  // const gstRate = gstAmt > 0 ? getGSTRate(paymentMethod) : 0;

  const statusColor = appt.status === "completed" ? "#0B3D2E" : appt.status === "confirmed" ? "#3E7B27" : appt.status === "cancelled" ? "#C62828" : "#F59E0B";
  const statusBg = appt.status === "completed" || appt.status === "confirmed" ? "#E8F5E8" : appt.status === "cancelled" ? "#FFEBEE" : "#FFF9E6";

  const statusHtml = `
    <div class="bill-label">Status</div>
    <div style="margin-top:5px;display:inline-block;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700;background:${statusBg};color:${statusColor}">${appt.status}</div>
    <div class="bill-detail" style="margin-top:5px">Payment: <strong>${appt.paymentStatus || "—"}</strong></div>`;

  const tableRows = `
    <thead><tr><th>#</th><th>Service</th><th>Pet</th><th>Date</th><th>Time</th><th>Amount</th></tr></thead>
    <tbody><tr>
      <td>1</td><td>${appt.serviceName || "—"}</td><td>${appt.petName || "—"}</td>
      <td>${fmtDate(appt.appointmentDate)}</td><td>${appt.appointmentTime || "—"}</td>
      <td>&#8377;${fmt(grandTotal)}</td>
    </tr></tbody>`;

  const extraInfo = `
    <div class="info-box"><div class="info-box-label">Payment Status</div><div class="info-box-val">${appt.paymentStatus || "—"}</div></div>
    <div class="info-box"><div class="info-box-label">Payment Mode</div><div class="info-box-val">${paymentMethod}</div></div>
    <div class="info-box"><div class="info-box-label">Invoice No</div><div class="info-box-val">${invoiceNo}</div></div>`;

  return buildHTML(
    logoSrc, invoiceNo, "INVOICE", fmtDate(appt.appointmentDate),
    { name: customerName, detail1: customerEmail },
    statusHtml, tableRows, grandTotal, 0, grandTotal, "GST (N/A)", paymentMethod, extraInfo, appt.notes || "", 0
  );
};

// ── Walk-in Invoice ───────────────────────────────────────────────────────────
export const buildWalkInInvoiceHTML = async (data) => {
  const logoSrc = await getLogoBase64();
  const { billNo, customerName, petName, phone, services, total, paymentMethod, notes, date } = data;
  const subtotal = Number(total) || 0;
  // const gstRate = getGSTRate(paymentMethod);
  // const gstAmt = subtotal * gstRate;
  // const grandTotal = subtotal + gstAmt;
  const gstAmt = 0;
  const grandTotal = subtotal;
  // const gstLabel = getGSTLabel(paymentMethod);
  const gstLabel = "GST (N/A)";

  const serviceRows = (services || [])
    .filter((s) => s.name?.trim())
    .map((s, i) => `<tr><td>${i + 1}</td><td>${s.name}</td><td>&#8377;${fmt(parseFloat(s.amount) || 0)}</td></tr>`)
    .join("");

  const tableRows = `
    <thead><tr><th>#</th><th>Service</th><th style="text-align:right">Amount</th></tr></thead>
    <tbody>${serviceRows}</tbody>`;

  const statusHtml = `
    <div class="bill-label">Payment Method</div>
    <div style="margin-top:5px;display:inline-block;padding:3px 12px;border-radius:20px;font-size:10px;font-weight:700;background:#E8F5E8;color:#0B3D2E">${paymentMethod || "—"}</div>`;

  return buildHTML(
    logoSrc, billNo, "WALK-IN BILL", fmtDate(date),
    { name: customerName, detail1: petName ? `Pet: ${petName}` : "", detail2: phone ? `Ph: ${phone}` : "" },
    statusHtml, tableRows, subtotal, 0, grandTotal, gstLabel, paymentMethod, "", notes || "", 0
  );
};

// ── Download PDF directly to device ──────────────────────────────────────────
export const downloadInvoicePDF = async (appt) => {
  const invoiceNo = `DH-${appt._id.slice(-8).toUpperCase()}`;
  const html = await buildInvoiceHTML(appt);
  await savePDF(html, `Invoice_${invoiceNo}`);
};

export const downloadWalkInInvoicePDF = async (data) => {
  const html = await buildWalkInInvoiceHTML(data);
  await savePDF(html, `Bill_${data.billNo}`);
};

const savePDF = async (html, fileName) => {
  try {
    const { uri: tempUri } = await Print.printToFileAsync({ html, base64: false });
    const destUri = FileSystem.documentDirectory + fileName + ".pdf";
    await FileSystem.copyAsync({ from: tempUri, to: destUri });
    Alert.alert(
      "✅ Downloaded",
      `${fileName}.pdf saved successfully.\n\nLocation: App Documents`,
      [
        {
          text: "Share",
          onPress: async () => {
            await Sharing.shareAsync(destUri, {
              mimeType: "application/pdf",
              UTI: "com.adobe.pdf",
              dialogTitle: fileName,
            });
          },
        },
        { text: "OK", style: "cancel" },
      ]
    );
  } catch (e) {
    console.log("PDF save error:", e);
    // Fallback: share directly
    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
        dialogTitle: fileName,
      });
    } catch {
      Alert.alert("Error", "Could not save PDF. Please try again.");
    }
  }
};
