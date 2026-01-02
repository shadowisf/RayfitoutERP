"use client";

import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function SideBar() {
  const { userInfo } = useAuth();

  const router = useRouter();
  const pathname = usePathname();

  const INVENTORY_DEPARTMENT_IDS = [8, 11, 15];
  const PROJECT_DEPARTMENT_IDS = [8, 10, 15, 16];

  const menuItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Material Request", path: "/mr" },

    ...(INVENTORY_DEPARTMENT_IDS.includes(userInfo?.departmentID ?? 0)
      ? [{ label: "Inventory Management", path: "/inventory" }]
      : []),

    ...(PROJECT_DEPARTMENT_IDS.includes(userInfo?.departmentID ?? 0)
      ? [{ label: "Project Management", path: "/project" }]
      : []),
  ];

  const isActive = (path: string) => {
    if (pathname === path) return true;
    if (path !== "/" && pathname.startsWith(path + "/")) return true;
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
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
