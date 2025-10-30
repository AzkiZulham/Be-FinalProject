"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendForgotPasswordEmail = exports.sendCheckInReminderEmail = exports.sendPaymentConfirmedEmail = exports.sendResendEmailVerification = exports.sendFirstEmailVerification = exports.sendVerificationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
// ======================================
// Verifikasi password (REGISTER)
// ======================================
const sendVerificationEmail = async (to, token, role) => {
    const url = `${process.env.FRONTEND_URL}/verify-password?token=${token}`;
    const mailOptions = {
        from: `"StayFinder" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Verifikasi Akun StayFinder",
        html: `
      <p>Halo!</p>
      <p>Silakan klik link di bawah ini untuk mengaktifkan akun Anda (${role}):</p>
      <a href="${url}" target="_blank">${url}</a>
      <p>Link ini berlaku selama 1 jam.</p>
      <p>Jika Anda tidak mendaftar akun ini, abaikan email ini.</p>
    `,
    };
    try {
        const info = await transporter.sendMail(mailOptions);
    }
    catch (error) {
        console.error("❌ [REGISTER] Gagal kirim email verifikasi akun:", error);
        throw error;
    }
};
exports.sendVerificationEmail = sendVerificationEmail;
// ======================================
// Verifikasi email pertama kali
// ======================================
const sendFirstEmailVerification = async (to, token) => {
    const url = `${process.env.API_URL}/api/auth/verify?token=${token}`;
    const mailOptions = {
        from: `"StayFinder" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Verifikasi Email StayFinder",
        html: `
      <p>Halo!</p>
      <p>Silakan klik link di bawah ini untuk memverifikasi email pertama Anda:</p>
      <a href="${url}" target="_blank">${url}</a>
      <p>Link ini berlaku selama 1 jam.</p>
      <p>Jika Anda tidak melakukan ini, abaikan email ini.</p>
    `,
    };
    try {
        const info = await transporter.sendMail(mailOptions);
    }
    catch (error) {
        console.error("❌ [FIRST VERIFY] Gagal kirim email:", error);
        throw error;
    }
};
exports.sendFirstEmailVerification = sendFirstEmailVerification;
// ======================================
// Resend verifikasi setelah update email
// ======================================
const sendResendEmailVerification = async (to, token) => {
    const url = `${process.env.API_URL}/api/auth/verify?token=${token}`;
    const mailOptions = {
        from: `"StayFinder" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Konfirmasi Email Baru StayFinder",
        html: `
      <p>Halo!</p>
      <p>Anda baru saja memperbarui alamat email Anda.</p>
      <p>Silakan klik link di bawah ini untuk memverifikasi email baru Anda:</p>
      <a href="${url}" target="_blank">${url}</a>
      <p>Link ini berlaku selama 1 jam.</p>
      <p>Jika Anda tidak mengganti email, segera hubungi dukungan kami.</p>
    `,
    };
    try {
        const info = await transporter.sendMail(mailOptions);
    }
    catch (error) {
        console.error("❌ [RESEND] Gagal kirim email verifikasi email baru:", error);
        throw error;
    }
};
exports.sendResendEmailVerification = sendResendEmailVerification;
const sendPaymentConfirmedEmail = async (to, username, propertyName, checkInDate, checkOutDate) => {
    const url = `${process.env.FRONTEND_URL}/legal`;
    const mailOptions = {
        from: `"StayFinder" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Pembayaran Dikonfirmasi - StayFinder",
        html: `
      <p>Halo <b>${username}</b>,</p>
      <p>Pembayaran kamu untuk properti <b>${propertyName}</b> telah dikonfirmasi oleh pemilik.</p>
      <p>Detail pemesanan:</p>
      <ul>
        <li><b>Check-in:</b> ${new Date(checkInDate).toLocaleDateString()}</li>
        <li><b>Check-out:</b> ${new Date(checkOutDate).toLocaleDateString()}</li>
      </ul>
      <p>Terima kasih telah menggunakan layanan kami. Sampai jumpa di tempat penginapan!</p>
      <br/>
      <p>Salam,</p>
      <p><b>StayFinder Team</b></p>

      <p>Silakan klik link ini untuk mengetahui Kebijakan Privasi & Syarat Ketentuan:</p>
      <a href="${url}" target="_blank">${url}</a>
    `,
    };
    try {
        const info = await transporter.sendMail(mailOptions);
    }
    catch (error) {
        console.error("Gagal kirim email notifikasi:", error);
    }
};
exports.sendPaymentConfirmedEmail = sendPaymentConfirmedEmail;
const sendCheckInReminderEmail = async (to, username, propertyName, checkInDate, checkOutDate) => {
    const url = `${process.env.FRONTEND_URL}/legal`;
    const mailOptions = {
        from: `"StayFinder" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Reminder Check-In - StayFinder",
        html: `
      <p>Halo <b>${username}</b>,</p>
      <p>Ini pengingat bahwa besok kamu akan check-in di <b>${propertyName}</b>.</p>
      <p>Detail pemesanan:</p>
      <ul>
        <li><b>Check-in:</b> ${new Date(checkInDate).toLocaleDateString()}</li>
        <li><b>Check-out:</b> ${new Date(checkOutDate).toLocaleDateString()}</li>
      </ul>
      <p>Selamat berlibur dan semoga penginapannya menyenangkan! ✨</p>
      <br/>
      <p>Salam,</p>
      <p><b>StayFinder Team</b></p>

      <p>Silakan klik link ini untuk mengetahui Kebijakan Privasi & Syarat Ketentuan:</p>
      <a href="${url}" target="_blank">${url}</a>
    `,
    };
    try {
        const info = await transporter.sendMail(mailOptions);
    }
    catch (error) {
        console.error("Gagal kirim reminder: ", error);
    }
};
exports.sendCheckInReminderEmail = sendCheckInReminderEmail;
// ======================================
// Forgot Password Email
// ======================================
const sendForgotPasswordEmail = async (to, resetToken) => {
    const url = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const mailOptions = {
        from: `"StayFinder" <${process.env.EMAIL_USER}>`,
        to,
        subject: "Reset Password - StayFinder",
        html: `
      <p>Halo!</p>
      <p>Anda telah meminta untuk mereset password akun StayFinder Anda.</p>
      <p>Silakan klik link di bawah ini untuk mereset password Anda:</p>
      <a href="${url}" target="_blank">${url}</a>
      <p>Link ini berlaku selama 1 jam.</p>
      <p>Jika Anda tidak meminta reset password, abaikan email ini.</p>
      <br/>
      <p>Salam,</p>
      <p><b>StayFinder Team</b></p>
    `,
    };
    try {
        const info = await transporter.sendMail(mailOptions);
    }
    catch (error) {
        console.error("❌ [FORGOT PASSWORD] Gagal kirim email reset password:", error);
        throw error;
    }
};
exports.sendForgotPasswordEmail = sendForgotPasswordEmail;
