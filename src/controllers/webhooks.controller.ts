import { Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../config/prisma";
import { TransactionStatus } from "@prisma/client";

export const midtransWebhook = async (req: Request, res: Response) => {
  try {
    const {
      order_id,
      transaction_status,
      fraud_status,
      payment_type,
      gross_amount,
      status_code,
      signature_key,
      settlement_time,
    } = req.body || {};

    const serverKey = process.env.MIDTRANS_SERVER_KEY as string;
    const payload = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const expected = crypto.createHash("sha512").update(payload).digest("hex");

    if (expected !== signature_key) {
      console.warn("invalid midtrans signature");
      return res.status(403).json({ error: "invalid siganture" });
    }

    const payment = await prisma.payment.findFirst({
      where: { midtransId: order_id },
    });

    if (!payment) {
      console.warn("Payment not found for order_id:", order_id);
      //   return res.status(404).json({ error: "Payment not found" });
      return res.status(200).json({ received: true, ignored: true });
    }

    let newPaymentStatus = "PENDING";
    let newTransactionStatus: TransactionStatus | null = null;
    let paidAt = null;

    switch (transaction_status) {
      case "capture":
        if (fraud_status === "challenge") {
          newPaymentStatus = "PENDING";
        } else {
          newPaymentStatus = "SETTLEMENT";
          newTransactionStatus = "ACCEPTED";
          paidAt = settlement_time ? new Date(settlement_time) : new Date();
        }
        break;
      case "settlement":
        newPaymentStatus = "SETTLEMENT";
        newTransactionStatus = "ACCEPTED";
        paidAt = settlement_time ? new Date(settlement_time) : new Date();
        break;
      case "pending":
        newPaymentStatus = "PENDING";
        newTransactionStatus = "WAITING_FOR_PAYMENT";
        break;
      case "cancel":
        newPaymentStatus = "CANCEL";
        newTransactionStatus = "CANCELLED";
        break;
      case "expire":
        newPaymentStatus = "EXPIRED";
        newTransactionStatus = "CANCELLED";
        break;
      default:
        newPaymentStatus = "PENDING";
    }

    await prisma.$transaction(async (prisma) => {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: newPaymentStatus,
          fraudStatus: String(fraud_status || "ACCEPT").toUpperCase(),
          paymentType: payment_type || payment.paymentType,
          paidAt,
        },
      });

      if (newTransactionStatus) {
        await prisma.transaction.update({
          where: { id: payment.transactionId },
          data: { status: newTransactionStatus },
        });
      }
    });
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("midtransWebhook error:", error);
    return res.status(500).json({ error: "Webhook processing error" });
  }
};
