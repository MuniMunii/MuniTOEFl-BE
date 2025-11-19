import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../routes/auth/auth.routes.js";
import type { NextFunction,Request,Response } from "express";
export const sessionMiddleware = async (req:Request, res:Response, next:NextFunction) => {
  try {
    const result = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers)
    });

    req.session = result?.session || null;
    req.user = result?.user || null;
    next();
  } catch (err) {
    req.session = null;
    req.user = null;
    next();
  }
};