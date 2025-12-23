"use client";

import { useRouter, usePathname } from "next/navigation";

export default function SideBar() {
  const router = useRouter();
  const pathname = usePathname();

  const menuItems = [
    { label: "Dashboard", path: "/dashboard" },
    { label: "Material Request", path: "/mr" },
    { label: "Inventory Management", path: "/inventory" },
    { label: "Project Management", path: "/project" },
  ];

  const isActive = (path: string) => {
    // Exact match for the path
    if (pathname === path) return true;
    // Check if current path starts with the menu item path (for child routes)
    // But exclude the root path to avoid matching everything
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
