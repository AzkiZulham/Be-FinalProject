import { Request } from 'express';
import { JwtPayload } from "jsonwebtoken";
import { Role } from "@prisma/client";

// ===========================
// Type: Authenticated User
// ===========================
interface AuthenticatedUser extends JwtPayload {
  id: number;
  role: Role;
  email: string;
}

interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser; 
}

declare global {
  namespace Express {
    interface Request {
      user?: any; 
    }
  }
}

