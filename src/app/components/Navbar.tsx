"use client";

import { useAuth } from "../context/AuthContext";

import NewMrButton from "./_NewMaterialRequestButton";
import NewProjectButton from "./_NewProjectButton";
import Button from "./Button";
import NotificationDropdown from "./NotificationButton";

export default function Navbar() {
  const { userInfo, logout } = useAuth();

  const logoIcon = "/icons/logo.svg";
  const searchIcon = "/icons/search.svg";
  const logoutIcon = "/icons/logout.svg";

  const handleSearch = (e: string) => {
    /* insert search query here */
  };

  return (
    <>
      <div className="header">
        <div className="left">
          <a href="/dashboard" className="logo-link">
            <img src={logoIcon} alt="rayfitout logo" />
          </a>

          <span style={{ color: "white" }}>PROCUREMENT MANAGEMENT</span>

          <form>
            <input
              type="text"
              placeholder="SEARCH"
              onChange={(e) => handleSearch(e.target.value)}
            />
            <img src={searchIcon} alt="search" />
          </form>
        </div>

        <div className="right">
          <NewMrButton />

          {(userInfo?.departmentID === 8 || userInfo?.departmentID === 16) && (
            <NewProjectButton />
          )}

          <NotificationDropdown />

          <span style={{ textTransform: "uppercase", color: "white" }}>
            {userInfo?.name?.split(" ")[0]} - {userInfo?.role}
          </span>

          <Button
            componentType={"button"}
            bgColor={"black"}
            borderColor={"white"}
            textColor={"white"}
            onClick={logout}
            style={{ padding: "10px 10px" }}
          >
            <img src={logoutIcon} alt="logout" />
          </Button>
        </div>
      </div>
    </>
  );
}
