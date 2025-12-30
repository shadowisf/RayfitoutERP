"use client";

import { useAuth } from "../context/AuthContext";

import NewMrButton from "./_NewMaterialRequestButton";
import NewProjectButton from "./_NewProjectButton";
import Button from "./Button";

export default function Navbar() {
  const { userInfo, logout } = useAuth();

  const logo_icon = "/icons/logo.svg";
  const search_icon = "/icons/search.svg";
  const notification_icon = "/icons/notification.svg";

  const handleSearch = (e: string) => {
    /* insert search query here */
  };

  return (
    <>
      <div className="header">
        <div className="left">
          <a href="/dashboard" className="logo-link">
            <img src={logo_icon} alt="rayfitout logo" />
          </a>

          <span style={{ color: "white" }}>PROCUREMENT MANAGEMENT</span>

          <form>
            <input
              type="text"
              placeholder="Search MR / Item / Project"
              onChange={(e) => handleSearch(e.target.value)}
            />
            <img src={search_icon} alt="search" />
          </form>
        </div>

        <div className="right">
          <button className="notifications">
            <img src={notification_icon} alt="notification icon" />
          </button>
          <NewMrButton />

          {userInfo?.departmentID === 8 && <NewProjectButton />}

          <span style={{ textTransform: "uppercase", color: "white" }}>
            {userInfo?.role} - {userInfo?.departmentID}
          </span>

          <Button
            componentType={"button"}
            bgColor={"black"}
            borderColor={"white"}
            textColor={"white"}
            onClick={logout}
          >
            LOGOUT
          </Button>
        </div>
      </div>
    </>
  );
}
