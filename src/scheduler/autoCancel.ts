import cron from "node-cron";
import { prisma } from "../config/prisma";

//tiap 5 menit
const scheduleRule = " */5 * * * *";

export const autoCancel = () => {
  cron.schedule(
    scheduleRule,
    async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      try {
        const result = await prisma.transaction.updateMany({
          where: {
            status: "WAITING_FOR_PAYMENT",
            createdAt: { lt: oneHourAgo },
            OR: [
              { payment: null },
              {
                payment: {
                  paymentStatus: { notIn: ["SETTLEMENT"] },
                },
              },
            ],
          },
          data: { status: "CANCELLED" },
        });

        if (result.count > 0) {
          console.log(`[AutoCancel] Cancelled ${result.count} tramsaction.`);
        }
      } catch (error) {
        console.error("[AutoCancel] Error: ", error);
      }
    },
    { timezone: "Asia/Jakarta" }
  );
  console.log("Auto-cancel cron startted (every 5 min, Asia/Jakarta");
};
