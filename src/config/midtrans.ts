import midtransClient from "midtrans-client";

const useMidtransProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
export const midtransSnap = useMidtransProduction
  ? new midtransClient.Snap({
      isProduction: true,
      serverKey: process.env.MIDTRANS_SERVER_KEY as string,
      clientKey: process.env.MIDTRANS_CLIENT_KEY as string,
    })
  : new midtransClient.Snap({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SANDBOX_SERVER_KEY as string,
      clientKey: process.env.MIDTRANS_SANDBOX_CLIENT_KEY as string,
    });
