import { Request, Response, NextFunction } from "express";

export const mockAuthUser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Simulasi login sebagai USER (id=1)
  (req as any).user = { id: 2, role: "USER" };
  next();
};

export const mockAuthTenant = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Simulasi login sebagai TENANT (id=2)
  (req as any).user = { id: 1, role: "TENANT" };
  next();
};
