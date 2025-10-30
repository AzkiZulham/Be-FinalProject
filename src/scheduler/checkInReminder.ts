import cron from "node-cron";
import { prisma } from "../config/prisma";
import { sendCheckInReminderEmail } from "../utils/mailer";

//everyday at 7 am
const scheduleRule = "0 7 * * *";

export const checkInReminder = () => {
  cron.schedule(
    scheduleRule,
    async () => {
      try {
        const now = new Date();

        const jakartaNow = new Date(
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Jakarta",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          })
            .format(now)
            .replace(",", "")
        );

        const y = jakartaNow.getFullYear();
        const m = jakartaNow.getMonth();
        const d = jakartaNow.getDate();

        const startTomorrow = new Date(y, m, d + 1, 0, 0, 0, 0);
        const endTomorrow = new Date(y, m, d + 2, 0, 0, 0, 0);

        const remind = await prisma.transaction.findMany({
          where: {
            status: "ACCEPTED",
            checkInDate: { gte: startTomorrow, lt: endTomorrow },
          },
          select: {
            id: true,
            checkInDate: true,
            checkOutDate: true,
            user: { select: { email: true, username: true } },
            roomType: { select: { property: { select: { name: true } } } },
          },
        });

        for (const element of remind) {
          const email = element.user?.email;
          if (!email) continue;

          const propetyName = element.roomType?.property?.name || "Property";
          await sendCheckInReminderEmail(
            email,
            element.user?.username || "User",
            propetyName,
            element.checkInDate,
            element.checkOutDate
          );
          console.log(
            `[H-1 Reminder] sent for transaction ${element.id} to ${email}`
          );
        }
        console.log(`[H-1 Reminder] Done. Count=${remind.length}`);
      } catch (error) {
        console.error("[H-1 Reminder] Error:", error);
      }
    },
    { timezone: "Asia/Jakarta" }
  );
  console.log("Check-in reminder cron started");
};
