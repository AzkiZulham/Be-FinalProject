import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // harus app password Gmail
  },
});

export const sendVerificationEmail = async (
  to: string,
  token: string,
  role: string
) => {
  // Link verifikasi ke frontend
  const url = `${process.env.FRONTEND_URL}/verify-password?token=${token}`;

  const mailOptions = {
    from: `"StayFinder" <${process.env.EMAIL_USER}>`,
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

export const sendPaymentConfirmedEmail = async (
  to: string,
  username: string,
  propertyName: string,
  checkInDate: Date,
  checkOutDate: Date
) => {
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
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("📧 Email notifikasi pembayaran terkirim:", info.response);
  } catch (error) {
    console.error("Gagal kirim email notifikasi:", error);
  }
};
