import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Frequently Asked Questions (FAQ)",
  description: "Find answers to common questions about SL Business Index (SLBI). Learn how to search, register, and verify your business on Sri Lanka's leading business directory.",
  openGraph: {
    title: "FAQ | SL Business Index",
    description: "Got questions? We've got answers. Explore our FAQ to learn more about SLBI features and services.",
  }
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
