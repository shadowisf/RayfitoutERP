"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";

interface SideBarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function SideBar({ isOpen, setIsOpen }: SideBarProps) {
  const { userInfo } = useAuth();

  const collapseMenuIcon = "/icons/collapse-menu.svg";

  const router = useRouter();
  const pathname = usePathname();

  const [mrActionCount, setMrActionCount] = useState<number>(0);
  const [inventoryActionCount, setInventoryActionCount] = useState<number>(0);

  const INVENTORY_DEPARTMENT_IDS = [8, 11, 15];
  const PROJECT_DEPARTMENT_IDS = [8, 9, 10, 15, 16];

  useEffect(() => {
    const fetchActionCount = async () => {
      if (!userInfo?.departmentID) return;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/mr/getActionCount`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ department_id: userInfo.departmentID }),
          },
        );

        const data = await res.json();

        if (data.success) {
          setMrActionCount(data.count);
        }
      } catch (error) {
        console.error("Error fetching MR action count:", error);
      }
    };

    fetchActionCount();

    const interval = setInterval(fetchActionCount, 30000);
    return () => clearInterval(interval);
  }, [userInfo]);

  useEffect(() => {
    if (!userInfo?.departmentID) return;

    if (![8, 11].includes(userInfo.departmentID)) {
      setInventoryActionCount(0);
      return;
    }

    const fetchInventoryActionCount = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/stock/getActionCount`,
        );

        const data = await res.json();

        if (data.success) {
          setInventoryActionCount(data.count);
        }
      } catch (error) {
        console.error("Error fetching Inventory action count:", error);
      }
    };

    fetchInventoryActionCount();

    const interval = setInterval(fetchInventoryActionCount, 30000);
    return () => clearInterval(interval);
  }, [userInfo]);

  const menuItems = [
    { label: "Dashboard", path: "/dashboard", icon: "/icons/dashboard.svg" },
    {
      label: "Requisitions",
      path: "/mr",
      icon: "/icons/mr.svg",
      count: mrActionCount,
    },
    { label: "Projects", path: "/project", icon: "/icons/projects.svg" },
    { label: "Vendors", path: "/vendor", icon: "/icons/vendors.svg" },
    {
      label: "Subcontractors",
      path: "/subcontractor",
      icon: "/icons/vendors.svg",
    },
    {
      label: "Payments",
      path: "/payment",
      icon: "/icons/payment-black.svg",
    },
    {
      label: "Inventory",
      path: "/inventory",
      icon: "/icons/inventory.svg",
      count: inventoryActionCount,
    },
  ];

  const isActive = (path: string) => {
    if (pathname === path) return true;
    if (pathname.startsWith(path + "/")) return true;
    if (path === "/boq" && pathname.startsWith("/boq")) return true;
    if (path === "/project" && pathname.startsWith("/boq")) return true;
    return false;
  };

  return (
    <>
      {/* Sidebar - Fixed position overlay */}
      <div
        className="side-bar"
        style={{
          position: "fixed",
          left: 0,
          top: "55px",
          height: "calc(100vh - 55px)",
          width: isOpen ? "275px" : "0px",
          overflow: "hidden",
          transition: "width 0.3s ease, background-color 0.3s ease",
          backgroundColor: isOpen ? "white" : "transparent",
          zIndex: 100,
          borderRight: isOpen ? "1px solid #e0e0e0" : "none",
        }}
      >
        {/* Sidebar Content */}
        <div
          style={{
            opacity: isOpen ? 1 : 0,
            transition: "opacity 0.2s ease",
            padding: "20px",
          }}
        >
          <h2>MENU</h2>

          <br />

          <div className="nav-container">
            {menuItems.map((item) => (
              <button
                key={item.label}
                className={isActive(item.path) ? "nav-active" : ""}
                onClick={() => router.push(item.path)}
              >
                <img src={item.icon} alt="icon" />
                {item.label}

                {item.count !== undefined && item.count > 0 && (
                  <span
                    style={{
                      backgroundColor: "rgb(248, 77, 77, 1)",
                      color: "white",
                      borderRadius: "50%",
                      width: "24px",
                      height: "24px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "12px",
                      fontWeight: "600",
                      marginLeft: "auto",
                    }}
                  >
                    {item.count > 99 ? "99+" : item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle Button - Fixed position, moves with sidebar state */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          left: isOpen ? "275px" : "0px",
          top: "65px",
          width: "32px",
          height: "32px",
          backgroundColor: "white",
          border: "1px solid rgba(217, 217, 217, 1)",
          borderLeft: "none",
          borderRadius: "0 6px 6px 0",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 101,
          transition: "left 0.3s ease",
          boxShadow: "2px 2px 5px rgba(0,0,0,0.1)",
        }}
      >
        {/* <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(85, 80, 80, 1)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: isOpen ? "rotate(0deg)" : "rotate(180deg)",
            transition: "transform 0.3s ease",
          }}
        >
          <polyline points="15 18 9 12 15 6" />
        </svg> */}
        <img src={collapseMenuIcon} alt="collapse menu" />
      </button>
    </>
  );
}
