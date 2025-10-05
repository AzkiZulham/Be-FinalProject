import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma";
import { JWT_SECRET, FRONTEND_URL } from "../config/config";
import { Role } from "@prisma/client";

export const googleCallback = async (req: Request, res: Response) => {
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
      user = await prisma.user.create({ data: { email, username, role: roleFromSession, isVerified: true } });
    } else if (user.role !== roleFromSession) {
      const loginPath = user.role === "TENANT" ? "/login/tenant" : "/login/user";
      return res.redirect(`${FRONTEND_URL}${loginPath}?error=email_registered_with_different_role`);
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    const redirectUrl = user.role === "TENANT" ? `${FRONTEND_URL}/tenant/dashboard?token=${token}` : `${FRONTEND_URL}/?token=${token}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("Google callback error:", err);
    return res.redirect("/login?error=oauth_failed");
  }
};

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
      user = await prisma.user.create({ data: { email, username, role: roleFromSession, isVerified: true } });
    } else if (user.role !== roleFromSession) {
      const loginPath = user.role === "TENANT" ? "/login/tenant" : "/login/user";
      return res.redirect(`${FRONTEND_URL}${loginPath}?error=email_registered_with_different_role`);
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    const redirectUrl = user.role === "TENANT" ? `${FRONTEND_URL}/tenant/dashboard?token=${token}` : `${FRONTEND_URL}/?token=${token}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error("Facebook callback error:", err);
    return res.redirect("/login?error=oauth_failed");
  }
};
