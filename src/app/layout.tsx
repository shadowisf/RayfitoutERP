import type { Metadata } from "next";
import "./globals.scss";
import Navbar from "./components/Navbar";
import SideBar from "./components/SideBar";

export const metadata: Metadata = {
  title: "Rayfitout - ERP",
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
        <Navbar />
        <SideBar />

        {children}
      </body>
    </html>
  );
}
