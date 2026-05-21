"use client";

import Navbar from "../components/Navbar";
import SideBar from "../components/SideBar";
import ProtectedRoute from "../components/ProtectedRoute";
import GlobalToast from "../components/Toast";
import NavigationLoader from "../components/_NavigationLoader";
import { useState } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <Navbar onHamburgerClick={() => setSidebarOpen(!sidebarOpen)} />

      <div style={{ display: "flex" }}>
        <SideBar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        {/* Mobile overlay backdrop */}
        {sidebarOpen && (
          <div
            className="sidebar-backdrop"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main
          className="protected-main"
          style={{
            flex: 1,
            paddingTop: "100px",
            paddingBottom: "100px",
            marginLeft: sidebarOpen ? "300px" : "60px",
            transition: "margin-left 0.3s ease",
            width: "100%",
            minWidth: 0,
          }}
        >
          <GlobalToast />
          <NavigationLoader>{children}</NavigationLoader>
        </main>
      </div>
    </ProtectedRoute>
  );
}
