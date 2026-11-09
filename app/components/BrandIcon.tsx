"use client";

import { createElement } from "react";

export type BrandIconProps = {
  name: string;
  size?: number | string;
  variant?: "linear" | "outline" | "twotone" | "bulk" | "bold" | "broken";
  color?: string;
  className?: string;
  title?: string;
};

/**
 * Brand-wide Iconsax adapter. The free official iconsax web component
 * uses its own efficient icon chunks; no dependency on a hosted CDN.
 *
 * This component provides one consistent icon interface for website
 * navigation, discovery surfaces, and the admin/vendor dashboards.
 */
export default function BrandIcon({
  name,
  size = 20,
  variant = "linear",
  color = "currentColor",
  className = "",
  title,
}: BrandIconProps) {
  return createElement("iconsax-icon", {
    name,
    type: variant,
    size: String(size),
    color,
    className,
    "aria-label": title,
    "aria-hidden": title ? undefined : "true",
    role: title ? "img" : undefined,
    style: { display: "inline-flex", flexShrink: 0, verticalAlign: "middle" },
  });
}
