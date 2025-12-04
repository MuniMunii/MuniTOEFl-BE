import { Session,User } from "better-auth";
import { auth } from "../routes/auth/auth.routes.ts";
export type AuthUser = typeof auth.$Infer.user;
declare global {
  namespace Express {
    interface Request {
      session?: Session | null;
      user: AuthUser | null;
    }
  }
}

export {};