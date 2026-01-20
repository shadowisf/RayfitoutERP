"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function SideBar() {
  const { userInfo } = useAuth();

  const router = useRouter();
  const pathname = usePathname();

  const INVENTORY_DEPARTMENT_IDS = [8, 11, 15];
  const PROJECT_DEPARTMENT_IDS = [8, 9, 10, 15, 16];

  const menuItems = [
    { label: "Dashboard", path: "/dashboard", icon: "/icons/dashboard.svg" },
    { label: "Material Requisitions", path: "/mr", icon: "/icons/mr.svg" },

    ...(PROJECT_DEPARTMENT_IDS.includes(userInfo?.departmentID ?? 0)
      ? [{ label: "Projects", path: "/project", icon: "/icons/projects.svg" }]
      : []),

    ...(INVENTORY_DEPARTMENT_IDS.includes(userInfo?.departmentID ?? 0)
      ? [
          {
            label: "Inventory",
            path: "/inventory",
            icon: "/icons/inventory.svg",
          },
        ]
      : []),
  ];

  const isActive = (path: string) => {
    if (pathname === path) return true;

    if (pathname.startsWith(path + "/")) return true;

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
          </button>
        ))}
      </div>
    </div>
  );
}
