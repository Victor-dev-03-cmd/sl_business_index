"use client";

import { useEffect } from "react";

/**
 * Register the official Iconsax custom element once, on the client.
 * Free icons are bundled by the package and require no API key.
 */
export default function IconsaxRegistry() {
  useEffect(() => {
    void import("iconsax").catch((error: unknown) => {
      console.error("Unable to initialize Iconsax:", error);
    });
  }, []);

  return null;
}
