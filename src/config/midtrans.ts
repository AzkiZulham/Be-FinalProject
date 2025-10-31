import midtransClient from "midtrans-client";

export const midtransSnap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SANDBOX_SERVER_KEY as string,
  clientKey: process.env.MIDTRANS_SANDBOX_CLIENT_KEY as string,
});
