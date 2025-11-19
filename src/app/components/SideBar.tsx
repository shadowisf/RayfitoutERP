"use client";

import { useState } from "react";

export default function SideBar() {
  const [active, setActive] = useState("Dashboard");

  return (
    <div className="side-bar">
      <p>MENU</p>

      <div className="nav-container">
        {[
          "Dashboard",
          "Material Request",
          "Inventory",
          "Project Management",
        ].map((item) => (
          <button
            key={item}
            className={active === item ? "nav-active" : ""}
            onClick={() => setActive(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
