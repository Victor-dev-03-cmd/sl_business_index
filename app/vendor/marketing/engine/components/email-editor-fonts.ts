import { Poppins, Outfit } from "next/font/google";

// Editor-only font classes; no global preload or remote browser font requests.
const poppins = Poppins({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--email-poppins",
});

const outfit = Outfit({
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--email-outfit",
});

export const emailEditorFontClasses = `${poppins.variable} ${outfit.variable}`;
