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
  const [resolutionActionCount, setResolutionActionCount] = useState<number>(0);
  const [paymentUnpaidCount, setPaymentUnpaidCount] = useState<number>(0);

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

  useEffect(() => {
    if (!userInfo?.departmentID) return;

    if (![8, 10].includes(userInfo.departmentID)) {
      setPaymentUnpaidCount(0);
      return;
    }

    const fetchPaymentUnpaidCount = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/getUnpaidCount`,
        );
        const data = await res.json();
        if (data.success) setPaymentUnpaidCount(data.count);
      } catch (error) {
        console.error("Error fetching payment unpaid count:", error);
      }
    };

    fetchPaymentUnpaidCount();

    const interval = setInterval(fetchPaymentUnpaidCount, 30000);
    return () => clearInterval(interval);
  }, [userInfo]);

  /* TEMPORARILY DISABLED - Resolution Center
  useEffect(() => {
    if (!userInfo?.departmentID) return;

    const RESOLUTION_DEPARTMENT_IDS = [8, 10, 11, 12];
    if (!RESOLUTION_DEPARTMENT_IDS.includes(userInfo.departmentID)) {
      setResolutionActionCount(0);
      return;
    }

    const fetchResolutionActionCount = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/api/qc/resolution/getActionCount`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ department_id: userInfo.departmentID }),
          },
        );

        const data = await res.json();

        if (data.success) {
          setResolutionActionCount(data.count);
        }
      } catch (error) {
        console.error("Error fetching resolution action count:", error);
      }
    };

    fetchResolutionActionCount();

    const interval = setInterval(fetchResolutionActionCount, 30000);
    return () => clearInterval(interval);
  }, [userInfo]);
  */

  const menuItems: {
    label: string;
    path: string;
    icon: string;
    count?: number;
    extraPaths?: string[];
    visibleTo?: number[];
  }[] = [
    {
      label: "Dashboard",
      path: "/dashboard",
      icon: "/icons/dashboard.svg",
      // Finance dept (10) uses /finance as their home — highlight Dashboard when there
      extraPaths: userInfo?.departmentID === 10 ? ["/finance"] : undefined,
    },
    {
      label: "Procurement Tracker",
      path: "/mr",
      icon: "/icons/mr.svg",
      count: mrActionCount,
    },
    { label: "Projects", path: "/project", icon: "/icons/projects.svg" },
    {
      label: "Payments",
      path: "/payment",
      icon: "/icons/payment-black.svg",
      count: paymentUnpaidCount,
      visibleTo: [8, 16, 9, 10],
    },
    /* {
      label: "Local Purchase Orders",
      path: "/lpo",
      icon: "/icons/lpo.svg",
    }, */
    /* {
      label: "Bill of Quantities",
      path: "/boq",
      icon: "/icons/boq.svg",
    }, */
    {
      label: "Finances",
      path: "/finance",
      icon: "/icons/bar-chart.svg",
      visibleTo: [8],
    },
    {
      label: "Vendors & Subcontractors",
      path: "/vendor",
      icon: "/icons/vendors.svg",
    },

    /* TEMPORARILY DISABLED - Resolution Center
    {
      label: "Resolution Center",
      path: "/resolution",
      icon: "/icons/resolution-center.svg",
      count: resolutionActionCount,
    },
    */

    {
      label: "Inventory",
      path: "/inventory",
      icon: "/icons/inventory.svg",
      count: inventoryActionCount,
    },
  ];

  const visibleMenuItems = menuItems.filter(
    (item) =>
      !item.visibleTo ||
      item.visibleTo.includes(Number(userInfo?.departmentID)),
  );

  const isActive = (item: { path: string; extraPaths?: string[] }) => {
    if (pathname === item.path) return true;
    if (pathname.startsWith(item.path + "/")) return true;
    if (item.extraPaths) {
      return item.extraPaths.some(
        (ep) => pathname === ep || pathname.startsWith(ep + "/"),
      );
    }
    return false;
  };

  const collapsedWidth = "60px";
  const expandedWidth = "300px";

  return (
    <>
      {/* Sidebar - Fixed position */}
      <div
        className="side-bar"
        style={{
          position: "fixed",
          left: 0,
          top: "55px",
          height: "calc(100vh - 55px)",
          width: isOpen ? expandedWidth : collapsedWidth,
          overflow: "hidden",
          transition: "width 0.3s ease, background-color 0.3s ease",
          backgroundColor: "white",
          zIndex: 100,
          borderRight: "1px solid #e0e0e0",
        }}
      >
        {/* Expanded Sidebar Content */}
        <div
          style={{
            opacity: isOpen ? 1 : 0,
            transition: "opacity 0.2s ease",
            padding: "60px 20px 0px 20px",
            pointerEvents: isOpen ? "auto" : "none",
            position: "absolute",
            top: 0,
            left: 0,
            width: expandedWidth,
          }}
        >
          <h4 style={{ color: "rgba(92, 92, 92, 1)" }}>MENU</h4>

          <br />

          <div className="nav-container">
            {visibleMenuItems.map((item) => (
              <button
                key={item.label}
                className={isActive(item) ? "nav-active" : ""}
                onClick={() => router.push(item.path)}
                style={{ textWrap: "nowrap" }}
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

        {/* Collapsed Icon Strip */}
        <div
          style={{
            opacity: isOpen ? 0 : 1,
            transition: "opacity 0.2s ease",
            pointerEvents: isOpen ? "none" : "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "90px",
            gap: "7px",
          }}
        >
          {visibleMenuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => router.push(item.path)}
              title={item.label}
              style={{
                position: "relative",
                width: "42px",
                height: "42px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: isActive(item) ? "black" : "none",
                border: "none",
                borderRadius: "10px",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <img
                src={item.icon}
                alt="icon"
                style={{
                  width: "18px",
                  height: "18px",
                  filter: isActive(item) ? "invert(1)" : "none",
                }}
              />
              {item.count !== undefined && item.count > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "2px",
                    right: "2px",
                    backgroundColor: "rgb(248, 77, 77)",
                    color: "white",
                    borderRadius: "50%",
                    width: "18px",
                    height: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: "600",
                  }}
                >
                  {item.count > 99 ? "99+" : item.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Toggle Button - Fixed position, moves with sidebar state */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: "fixed",
          /* left: isOpen ? expandedWidth : collapsedWidth, */
          left: isOpen ? "260px" : "20px",
          top: "75px",
          /* width: "32px",
          height: "32px", */
          backgroundColor: "transparent",
          borderLeft: "none",
          borderRadius: "0 6px 6px 0",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 101,
          transition: "left 0.3s ease",
        }}
      >
        <img
          style={{
            width: "18px",
            height: "18px",
          }}
          src={collapseMenuIcon}
          alt="collapse menu"
        />
      </button>
    </>
  );
}
