import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Classroom Pulse",
  description: "Student assessment tracking for focused teaching.",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
