"use client";

import { useAuth } from "../context/AuthContext";

import NewMrButton from "./_NewMaterialRequestButton";
import NewProjectButton from "./_NewProjectButton";
import Button from "./Button";
import NotificationDropdown from "./NotificationButton";
import SearchBar from "./SearchBar";

export default function Navbar() {
  const { userInfo, logout } = useAuth();

  const logoIcon = "/icons/logo.svg";
  const logoutIcon = "/icons/logout.svg";

  return (
    <>
      <div className="header">
        <div className="left">
          <a href="/dashboard" className="logo-link">
            <img src={logoIcon} alt="rayfitout logo" />
          </a>

          <SearchBar />
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
