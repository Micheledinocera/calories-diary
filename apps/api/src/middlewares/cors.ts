import cors from "cors";
import type { RequestHandler } from "express";

/** Turns "https://calories-diary-*.vercel.app" into a regex; entries without "*" match exactly. */
function versoRegex(origine: string): RegExp {
  const escaped = origine.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", "[^/]*");
  return new RegExp(`^${escaped}$`);
}

export function corsConOrigini(origini: string[]): RequestHandler {
  const ammesse = origini.map(versoRegex);
  return cors({
    origin: (origin, callback) => {
      // Requests without Origin (curl, health checks, same-origin) are not CORS requests.
      callback(null, !origin || ammesse.some((r) => r.test(origin)));
    },
  });
}
