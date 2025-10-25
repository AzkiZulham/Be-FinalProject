import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ======================================
// Verifikasi password (REGISTER)
// ======================================
export const sendVerificationEmail = async (
  to: string,
  token: string,
  role: string
) => {
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
  } catch (error) {
    console.error("❌ [REGISTER] Gagal kirim email verifikasi akun:", error);
    throw error;
  }
};

// ======================================
// Verifikasi email pertama kali
// ======================================
export const sendFirstEmailVerification = async (to: string, token: string) => {
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
  } catch (error) {
    console.error("❌ [FIRST VERIFY] Gagal kirim email:", error);
    throw error;
  }
};

// ======================================
// Resend verifikasi setelah update email
// ======================================
export const sendResendEmailVerification = async (
  to: string,
  token: string
) => {
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
  } catch (error) {
    console.error(
      "❌ [RESEND] Gagal kirim email verifikasi email baru:",
      error
    );
    throw error;
  }
};

export const sendPaymentConfirmedEmail = async (
  to: string,
  username: string,
  propertyName: string,
  checkInDate: Date,
  checkOutDate: Date
) => {
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
        <li><b>Check-out:</b> ${new Date(
          checkOutDate
        ).toLocaleDateString()}</li>
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
  } catch (error) {
    console.error("Gagal kirim email notifikasi:", error);
  }
};

export const sendCheckInReminderEmail = async (
  to: string,
  username: string,
  propertyName: string,
  checkInDate: Date,
  checkOutDate: Date
) => {
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
        <li><b>Check-out:</b> ${new Date(
          checkOutDate
        ).toLocaleDateString()}</li>
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
  } catch (error) {
    console.error("Gagal kirim reminder: ", error);
  }
};

// ======================================
// Forgot Password Email
// ======================================
export const sendForgotPasswordEmail = async (
  to: string,
  resetToken: string
) => {
  const url = `${
    process.env.FRONTEND_URL || "http://localhost:3001"
  }/reset-password?token=${resetToken}`;
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
  } catch (error) {
    console.error(
      "❌ [FORGOT PASSWORD] Gagal kirim email reset password:",
      error
    );
    throw error;
  }
};
