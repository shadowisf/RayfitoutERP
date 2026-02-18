"use client";

import Navbar from "../components/Navbar";
import SideBar from "../components/SideBar";
import ProtectedRoute from "../components/ProtectedRoute";
import GlobalToast from "../components/Toast";
import { useState } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <Navbar />

      <div style={{ display: "flex" }}>
        <SideBar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <main
          style={{
            flex: 1,
            paddingTop: "100px",
            paddingBottom: "50px",
            paddingLeft: "40px",
            paddingRight: "40px",
            marginLeft: sidebarOpen ? "275px" : "0px",
            transition: "margin-left 0.3s ease",
            width: "100%",
          }}
        >
          <GlobalToast />
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
