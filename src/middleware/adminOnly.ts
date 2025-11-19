import type { NextFunction,Request,Response } from "express";
export const requireRoleAdmin = (role:'admin') => {
  return (req:Request, res:Response, next:NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden: Admin only" });
    }
    next();
  };
};
