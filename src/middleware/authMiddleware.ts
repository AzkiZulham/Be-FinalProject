import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/config";

export interface JwtPayload {
  id: string;
  role: "USER" | "TENANT";
  email: string;
  verified?: boolean;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// ✅ Cek token dan decode user
export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token tidak ditemukan." });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Token kosong." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error: any) {
    console.error("JWT Error:", error);
// ✅ Jika token sudah kedaluwarsa
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token sudah kedaluwarsa, silakan login ulang." });
    }
// ✅ Jika token tidak valid
    return res.status(403).json({ message: "Token tidak valid." });
  }
};

// ✅ Batasi akses berdasarkan role
export const authorize =
  (roles: ("USER" | "TENANT")[]) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: "User belum login." });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Role tidak diizinkan." });
    }
    next();
  };
