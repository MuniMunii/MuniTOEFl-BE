import { Session,User } from "better-auth";
export type AuthUser = typeof auth.$Infer.User;
declare global {
  namespace Express {
    interface Request {
      session?: Session | null;
      user: AuthUser | null;
    }
  }
}

export {};