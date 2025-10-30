"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.autoCancel = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const prisma_1 = require("../config/prisma");
//tiap 5 menit
const scheduleRule = " */5 * * * *";
const autoCancel = () => {
    node_cron_1.default.schedule(scheduleRule, async () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        try {
            const result = await prisma_1.prisma.transaction.updateMany({
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
        }
        catch (error) {
            console.error("[AutoCancel] Error: ", error);
        }
    }, { timezone: "Asia/Jakarta" });
    console.log("Auto-cancel cron startted (every 5 min, Asia/Jakarta");
};
exports.autoCancel = autoCancel;
