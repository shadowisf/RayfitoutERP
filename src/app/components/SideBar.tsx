"use client";

import { useRouter, usePathname } from "next/navigation";

export default function SideBar() {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Material Request", path: "/mr" },
    { label: "Inventory", path: "/inventory" },
    { label: "Project Management", path: "/project" },
  ];

  return (
    <div className="side-bar">
      <h2>MENU</h2>

      <br />

      <div className="nav-container">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={pathname === item.path ? "nav-active" : ""}
            onClick={() => router.push(item.path)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
