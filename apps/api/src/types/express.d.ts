import type { SessionUser } from "@obragoito/core";

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export {};
