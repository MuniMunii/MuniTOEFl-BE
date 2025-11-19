import type { NextFunction,Request,Response } from "express";
export const requireAuth = (req:Request, res:Response, next:NextFunction) => {
  if (!req.session || !req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
