import { Response, NextFunction, Request } from "express";
import jwt from "jsonwebtoken";
import { PrismaClient, Role } from "@prisma/client";
import { AuthenticatedUser } from "@/types/express";


const prisma = new PrismaClient();

// ===========================
// Middleware: authenticate()
// ===========================
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token tidak ditemukan" });
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET as string;

    const decoded = jwt.verify(token, secret) as AuthenticatedUser;
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: "Token tidak valid" });
    }

    // Cek user di database
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    // Tempel data user ke req
    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
    };

    return next(); 
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(401).json({ message: "Autentikasi gagal" });
  }
};

// ===========================
// Middleware: authorize()
// ===========================
// Bisa dipakai untuk role: USER, TENANT, ADMIN, dll.
export const authorize = (roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction): Response | void => {
    if (!req.user) {
      return res.status(401).json({ message: "User belum login." });
    }

    if (!roles.includes((req.user as AuthenticatedUser).role)) {
      return res.status(403).json({ message: "Akses ditolak." });
    }

    return next(); 
  };
};
