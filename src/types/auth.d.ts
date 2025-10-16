import { DefaultSession, DefaultUser } from "@auth/core/types";
import { JWT as DefaultJWT } from "@auth/core/jwt";

declare module "@auth/core/types" {
  interface Session {
    user: {
      _id: string;
      username: string;
      role: string;
      cover?: string | null;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    _id: string;
    username: string;
    role: string;
    cover?: string | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT extends DefaultJWT {
    _id: string;
    username: string;
    role: string;
    cover?: string | null;
  }
}
