import { Request, Response } from "express";
import { PrismaClient, Role } from "@prisma/client";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendVerificationEmail } from "../utils/mailer";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

// ============================
// REGISTER USER/TENANT
// ============================
export const register = async (req: Request, res: Response) => {
  try {
    const { email, username, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: "Email dan role wajib diisi" });
    }

    if (!["USER", "TENANT"].includes(role)) {
      return res.status(400).json({ error: "Role tidak valid" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(400).json({ error: "Email sudah terdaftar" });

    const generatedUsername = username || email.split("@")[0];

    const token = crypto.randomBytes(32).toString("hex");
    const expireAt = new Date();
    expireAt.setHours(expireAt.getHours() + 1); // token berlaku 1 jam

    await prisma.user.create({
      data: {
        email,
        username: generatedUsername,
        role: role as Role,
        verifyToken: token,
        verifyTokenExpireAt: expireAt,
        isVerified: false,
      },
    });

    await sendVerificationEmail(email, token, role);

    res.status(201).json({ message: "Registrasi berhasil, cek email untuk verifikasi." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================
// VERIFY PASSWORD & AUTO-LOGIN
// ============================
export const verifyPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) return res.status(400).json({ error: "Token dan password wajib diisi" });

    const user = await prisma.user.findFirst({ where: { verifyToken: token } });
    if (!user) return res.status(400).json({ error: "Token tidak valid atau sudah digunakan" });

    if (!user.verifyTokenExpireAt || user.verifyTokenExpireAt < new Date()) {
      return res.status(400).json({ error: "Token sudah kadaluarsa" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isVerified: true,
        verifyToken: null,
        verifyTokenExpireAt: null,
      },
    });

    const jwtToken = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Akun aktif!",
      token: jwtToken,
      redirect: updatedUser.role === "USER" ? "/" : "/tenant/dashboard",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// ============================
// GOOGLE OAUTH CALLBACK SAFE
// ============================
export const googleCallback = async (req: Request, res: Response) => {
  try {
    const profile = req.user as any;
    const roleFromSession = (req.session as any)?.role as Role || "USER";

    if (!profile || !profile.emails?.[0]) {
      return res.redirect("/login?error=no_email");
    }

    const email = profile.emails[0].value;
    const username = profile.displayName?.replace(/\s+/g, "_") || email.split("@")[0];

    // Cek user di DB
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Buat akun baru
      user = await prisma.user.create({
        data: { email, username, role: roleFromSession, isVerified: true },
      });
    } else {
      // Email sudah ada
      if (user.role !== roleFromSession) {
        const loginPath = user.role === "TENANT" ? "/login/tenant" : "/login/user";
        return res.redirect(`${loginPath}?error=email_registered`);
      }
    }
    

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Redirect sesuai role
    const redirectUrl =
      user.role === "TENANT"
        ? `${process.env.FRONTEND_URL}/tenant/dashboard?token=${token}`
        : `${process.env.FRONTEND_URL}/?token=${token}`;

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("Google callback error:", err);
    return res.redirect("/login?error=oauth_failed");
  }
};

// ============================
// FACEBOOK OAUTH CALLBACK SAFE
// ============================
export const facebookCallback = async (req: Request, res: Response) => {
  try {
    const profile = req.user as any;
    const roleFromSession = (req.session as any)?.role as Role || "USER";

    if (!profile || !profile.emails?.[0]) {
      return res.redirect("/login?error=no_email");
    }

    const email = profile.emails[0].value;
    const username = profile.displayName?.replace(/\s+/g, "_") || email.split("@")[0];

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Buat akun baru
      user = await prisma.user.create({
        data: { email, username, role: roleFromSession, isVerified: true },
      });
    } else {
      // Email sudah ada
      if (user.role !== roleFromSession) {
        const loginPath = user.role === "TENANT" ? "/login/tenant" : "/login/user";
        return res.redirect(`${loginPath}?error=email_registered`);
      }
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
      expiresIn: "7d",
    });

    const redirectUrl =
      user.role === "TENANT"
        ? `${process.env.FRONTEND_URL}/tenant/dashboard?token=${token}`
        : `${process.env.FRONTEND_URL}/?token=${token}`;

    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("Facebook callback error:", err);
    return res.redirect("/login?error=oauth_failed");
  }
};


// ============================
// VERIFY TOKEN (CEK LOGIN STATUS)
// ============================
export const verifyToken = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: number;
      email: string;
      role: Role;
    };

    // Optional: ambil ulang user dari DB biar selalu up-to-date
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, email: true, role: true, isVerified: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (err) {
    console.error("Verify token error:", err);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};
