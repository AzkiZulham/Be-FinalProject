const MIDTRANS_BASE =
  process.env.MIDTRANS_IS_PRODUCTION === "true"
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com";

export async function expireMidtrans(orderId: string) {
  const serverKey = process.env.MIDTRANS_SANDBOX_SERVER_KEY || "";
  const auth = Buffer.from(serverKey + ":").toString("base64");

  const resp = await fetch(`${MIDTRANS_BASE}/v2/${orderId}/expire`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Midtrans expire failed ${resp.status}: ${text}`);
  }
  return resp.json();
}
