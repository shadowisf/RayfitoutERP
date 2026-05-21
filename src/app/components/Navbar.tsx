"use client";

import { useAuth } from "../context/AuthContext";
import CreateNewMaterialButton from "./_CreateNewMaterialButton";

import NewMrButton from "./_NewMaterialRequestButton";
import NewProjectButton from "@/app/(protected)/project/components/_NewProjectButton";
import Button from "./Button";
import NotificationDropdown from "./NotificationButton";
import SearchBar from "./SearchBar";

type NavbarProps = {
  onHamburgerClick?: () => void;
};

export default function Navbar({ onHamburgerClick }: NavbarProps) {
  const { userInfo, logout } = useAuth();

  const logoIcon = "/icons/logo.svg";
  const logoutIcon = "/icons/logout.svg";

  const initials = userInfo?.name
    ? userInfo.name
        .split(" ")
        .slice(0, 2)
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <>
      <div className="header">
        {/* ── Desktop layout ── */}
        <div className="left desktop-nav-left">
          <a href="/dashboard" className="logo-link">
            <img src={logoIcon} alt="rayfitout logo" />
          </a>

          <SearchBar />
        </div>

        <div className="right desktop-nav-right">
          {(userInfo?.departmentID === 8 || userInfo?.departmentID === 16) && (
            <>
              <CreateNewMaterialButton style={{ border: "1px solid white" }} />
              {/* <NewProjectButton /> */}
            </>
          )}

          <NewMrButton />

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

        {/* ── Mobile layout ── */}
        <button
          className="mobile-hamburger"
          onClick={onHamburgerClick}
          aria-label="Open menu"
        >
          <span />
          <span />
          <span />
        </button>

        <div className="mobile-nav-title">
          <strong>Rayfitout</strong>&nbsp;MAESTRO
        </div>

        <div className="mobile-nav-right">
          <NotificationDropdown />
          <div className="nav-avatar">{initials}</div>
        </div>
      </div>
    </>
  );
}
