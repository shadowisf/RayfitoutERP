import type { Metadata } from "next";
import "./globals.scss";
import { AuthProvider } from "./context/AuthContext";

export const metadata: Metadata = {
  title: "Enterprise Resource Planning - Rayfitout",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
