import { getSession } from "@auth/express"
import type { Request,Response,NextFunction } from "express";
import { authConfig } from "../routes/auth/auth.routes.js";
import { createResponse } from "../utils/createResponse.js";
export async function authenticatedUser(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const session = res.locals.session ?? (await getSession(req, authConfig))
  if (!session?.user) {
    res.status(403).json(createResponse(false,'Unauthorized',null,'Unauthorized'))
  } else {
    next()
  }
}