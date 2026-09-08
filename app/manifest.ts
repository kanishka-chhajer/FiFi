import type { MetadataRoute } from "next";

/**
 * What Android uses when the app is added to a home screen, and what makes it
 * open without browser chrome once installed.
 *
 * iOS reads almost none of this — it takes the apple-icon and the
 * apple-mobile-web-app tags from the document head instead — so the icon is
 * declared in both places on purpose.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FIFI",
    short_name: "FIFI",
    description: "One jar of fireflies, shared between two people.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A1831",
    theme_color: "#0A1831",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
