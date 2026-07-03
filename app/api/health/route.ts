import { NextResponse } from "next/server";
import logger from "~/lib/logger";

export function GET() {
  // debug, not info — this is hit every few seconds by container/uptime probes and carries no
  // diagnostic value on the happy path.
  logger.debug("Health check endpoint called");

  try {
    const response = { status: "ok", timestamp: new Date().toISOString() };
    logger.debug({ response }, "Health check successful");
    return NextResponse.json(response);
  } catch (err) {
    // `err`, not `error` — Pino only auto-serializes the `err` key into { type, message, stack };
    // any other key holding a raw Error object serializes to an empty `{}`.
    logger.error({ err }, "Health check failed");
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
