// src/utils/mailer.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // harus app password Gmail
  },
});

export const sendVerificationEmail = async (to: string, token: string, role: string) => {
  // Link verifikasi ke frontend
  const url = `${process.env.FRONTEND_URL}/verify-password?token=${token}`;

  const mailOptions = {
    from: `"noreply" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Verifikasi Akun StayFinder",
    html: `
      <p>Halo!</p>
      <p>Silakan klik link ini untuk memverifikasi akun Anda (${role}):</p>
      <a href="${url}" target="_blank">${url}</a>
      <p>Link ini berlaku 1 jam.</p>
      <p>Jika Anda tidak membuat akun, abaikan email ini.</p>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email terkirim:", info.response);
  } catch (error) {
    console.error("Gagal kirim email:", error);
    throw error;
  }
};
