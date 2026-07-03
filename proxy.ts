import { type NextRequest, NextResponse } from "next/server";
import logger from "~/lib/logger";

export function proxy(request: NextRequest) {
  const requestId = crypto.randomUUID();

  // Create a logger with request context
  const requestLogger = logger.child({
    method: request.method,
    requestId,
    url: request.url,
    userAgent: request.headers.get("user-agent")
  });

  requestLogger.info("Incoming request");

  // Continue with the request. `NextResponse.next()` is a pass-through signal, not the eventual
  // response — middleware runs before the route handler/page, so it can't see the real status code
  // or measure real request duration. Route handlers log their own outcome instead.
  const response = NextResponse.next();
  response.headers.set("X-Request-ID", requestId);

  return response;
}

// Configure which routes to run proxy on
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)"
  ]
};
