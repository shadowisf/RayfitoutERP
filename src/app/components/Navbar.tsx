"use client";

import { useAuth } from "../context/AuthContext";
import CreateNewMaterialButton from "./_CreateNewMaterialButton";
import NewMrButton from "./_NewMaterialRequestButton";
import NotificationDropdown from "./NotificationButton";
import SearchBar from "./SearchBar";
import Button from "./Button";
import { useState, useRef, useEffect } from "react";

type NavbarProps = {
  onHamburgerClick?: () => void;
};

export default function Navbar({ onHamburgerClick }: NavbarProps) {
  const { userInfo, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const logoIcon = "/icons/logo.svg";
  const logoutIcon = "/icons/logout.svg";

  const initials = userInfo?.name ? userInfo.name.trim()[0].toUpperCase() : "?";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(e.target as Node)
      ) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
            <CreateNewMaterialButton style={{ border: "1px solid white" }} />
          )}

          <NewMrButton />

          <NotificationDropdown />

          {/* ── Profile container ── */}
          <div ref={profileRef} style={{ position: "relative" }}>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                background: "transparent",
                border: "none",
                borderRadius: "0",
                cursor: "pointer",
                padding: "4px 0",
                color: "white",
              }}
            >
              {/* Avatar */}
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  backgroundColor: "white",
                  color: "black",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "700",
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>
              {/* Name – Role */}
              <span
                style={{
                  whiteSpace: "nowrap",
                  color: "white",
                }}
              >
                {userInfo?.name?.split(" ")[0]} – {userInfo?.role}
              </span>
            </button>

            {/* ── Dropdown ── */}
            {profileOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  right: 0,
                  backgroundColor: "white",
                  border: "1px solid rgba(207,207,207,1)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  zIndex: 300,
                  minWidth: "220px",
                  overflow: "hidden",
                }}
              >
                {/* User header */}
                <div
                  style={{
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    borderBottom: "1px solid rgba(207,207,207,1)",
                  }}
                >
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "50%",
                      backgroundColor: "black",
                      color: "white",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: "700",
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: "600",
                        fontSize: "13px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {userInfo?.name}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "rgba(110,110,110,1)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {userInfo?.email}
                    </div>
                  </div>
                </div>

                {/* User Settings */}
                <a
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "10px 16px",
                    textDecoration: "none",
                    color: "black",
                    fontWeight: "600",
                    fontSize: "13px",
                    backgroundColor: "transparent",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "rgba(245,245,245,1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <img src="/icons/settings.svg" alt="" style={{ width: "16px", height: "16px", opacity: 0.7 }} />
                  User Settings
                </a>

                {/* Manage Database — QS and Manager only */}
                {(userInfo?.departmentID === 8 || userInfo?.departmentID === 16) && (
                  <a
                    href="/settings/manage/material"
                    onClick={() => setProfileOpen(false)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      width: "100%",
                      padding: "10px 16px",
                      textDecoration: "none",
                      color: "black",
                      fontWeight: "600",
                      fontSize: "13px",
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "rgba(245,245,245,1)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <img src="/icons/database.svg" alt="" style={{ width: "16px", height: "16px", opacity: 0.7 }} />
                    Manage Database
                  </a>
                )}

                {/* Team Management — commented out for now
                <a
                  href="/team"
                  onClick={() => setProfileOpen(false)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    width: "100%",
                    padding: "10px 16px",
                    textDecoration: "none",
                    color: "black",
                    fontWeight: "600",
                    fontSize: "13px",
                    backgroundColor: "transparent",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor = "rgba(245,245,245,1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  <img src="/icons/team.svg" alt="" style={{ width: "16px", height: "16px", opacity: 0.7 }} />
                  Team Management
                </a>
                */}

              </div>
            )}
          </div>

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
          <div className="nav-avatar">{initials}</div>
        </div>
      </div>
    </>
  );
}
