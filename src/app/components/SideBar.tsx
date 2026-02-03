"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";

export default function SideBar() {
  const { userInfo } = useAuth();

  const router = useRouter();
  const pathname = usePathname();

  const [mrActionCount, setMrActionCount] = useState<number>(0);
  const [inventoryActionCount, setInventoryActionCount] = useState<number>(0);

  const INVENTORY_DEPARTMENT_IDS = [8, 11, 15];
  const PROJECT_DEPARTMENT_IDS = [8, 9, 10, 15, 16];

  // Fetch MR action count
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

    // Refresh count every 30 seconds
    const interval = setInterval(fetchActionCount, 30000);

    return () => clearInterval(interval);
  }, [userInfo]);

  useEffect(() => {
    if (!userInfo?.departmentID) return;

    // Only Manager & Storekeeper
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
      label: "Material Requisitions",
      path: "/mr",
      icon: "/icons/mr.svg",
      count: mrActionCount,
    },
    { label: "Projects", path: "/project", icon: "/icons/projects.svg" },
    { label: "Vendors", path: "/vendor", icon: "/icons/vendors.svg" },
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
    <div className="side-bar">
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

            {/* Badge for action count */}
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
                }}
              >
                {item.count > 99 ? "99+" : item.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
