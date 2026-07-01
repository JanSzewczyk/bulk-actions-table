import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#1a202c", // Matches Tailwind's bg-app-background
    description: "A Next.js application with Tailwind CSS and optimized setup.",
    display: "standalone",
    name: "Bulk Actions Table",
    short_name: "Bulk Actions Table",
    start_url: "/",
    theme_color: "#1a202c" // Matches Tailwind's bg-app-background
  };
}
