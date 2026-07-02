import "server-only";

// Public API of the "tickets" server zone. Consumers outside the feature (pages, route handlers)
// import ONLY from here; the files behind it (db, services) are private implementation details.
export * from "./api";
