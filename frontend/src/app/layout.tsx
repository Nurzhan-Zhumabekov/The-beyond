import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Beyond — AI Content Factory",
  description: "Generate and refine branded media packages"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
