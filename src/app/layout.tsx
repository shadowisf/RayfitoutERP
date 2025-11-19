import type { Metadata } from "next";
import "./globals.scss";
import Header from "./components/Header";
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
        <Header />
        <SideBar />

        {children}
      </body>
    </html>
  );
}
