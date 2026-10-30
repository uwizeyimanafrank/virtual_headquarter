import type { Metadata } from "next";

// The Office must never appear in search engines.
export const metadata: Metadata = {
  title: "Office",
  robots: { index: false, follow: false },
};

export default function OfficeRoot({ children }: { children: React.ReactNode }) {
  return children;
}
