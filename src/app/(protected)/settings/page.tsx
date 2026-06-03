"use client";

import { useAuth } from "@/app/context/AuthContext";
import { useState } from "react";
import InputItem from "@/app/components/InputItem";
import Button from "@/app/components/Button";

const DATABASE_TILES = [
  { label: "Material", href: "/settings/manage/material" },
  // { label: "Vendor & Subcontractor", href: "/vendor" },
  // { label: "Project & BOQ",          href: "/project" },
  // { label: "Invoice & Quotations",   href: "/finance" },
];

export default function SettingsPage() {
  const { userInfo } = useAuth();

  const initials = userInfo?.name ? userInfo.name.trim()[0].toUpperCase() : "?";

  const [language, setLanguage] = useState<"en" | "ar">("en");

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* ── ACCOUNT INFORMATION ─────────────────────────────────── */}
      <div className="widget-container">
        <h2
          style={{
            textTransform: "uppercase",
            marginBottom: "24px",
          }}
        >
          Account Information
        </h2>

        <div style={{ display: "flex", gap: "32px", alignItems: "flex-start" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <div className="input-row full">
              <InputItem
                label="USERNAME"
                value={userInfo?.name ?? ""}
                type="text"
                onChange={() => {}}
                disabled
                noOptionalLabel
              />
            </div>
            <div className="input-row full">
              <InputItem
                label="EMAIL"
                value={userInfo?.email ?? ""}
                type="text"
                onChange={() => {}}
                disabled
                noOptionalLabel
              />
            </div>
            <div className="input-row full">
              <InputItem
                label="PASSWORD"
                value="••••••••••••"
                type="text"
                onChange={() => {}}
                disabled
                noOptionalLabel
              />
            </div>
          </div>

          {/* Avatar */}
          <div
            style={{
              width: "150px",
              height: "150px",
              borderRadius: "50%",
              backgroundColor: "black",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "75px",
              fontWeight: "700",
              flexShrink: 0,
              marginTop: "20px",
            }}
          >
            {initials}
          </div>
        </div>
      </div>

      <br />

      {/* ── NOTIFICATION PREFERENCES (commented out) ─────────────
      <div className="widget-container" style={{ marginBottom: "24px" }}>
        <h2>Notification Preferences</h2>
        ...
      </div>
      ── */}

      <br />

      {/* ── LANGUAGE ────────────────────────────────────────────── */}
      {/* <div className="widget-container" style={{ marginBottom: "24px" }}>
        <h2
          style={{
            fontSize: "12px",
            fontWeight: "700",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginBottom: "18px",
            color: "black",
          }}
        >
          Language
        </h2>

        <div style={{ display: "flex", gap: "24px" }}>
          {(["en", "ar"] as const).map((lang) => (
            <label
              key={lang}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: language === lang ? "600" : "400",
              }}
            >
              <input
                type="radio"
                name="language"
                checked={language === lang}
                onChange={() => setLanguage(lang)}
                style={{ accentColor: "black", width: "16px", height: "16px" }}
              />
              {lang === "en" ? "English" : "العربية"}
            </label>
          ))}
        </div>
      </div> */}

      <br />

      {/* Save */}
      {/* <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: "32px",
        }}
      >
        <button
          style={{
            backgroundColor: "black",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "11px 28px",
            fontSize: "13px",
            fontWeight: "700",
            letterSpacing: "0.05em",
            cursor: "pointer",
            textTransform: "uppercase",
          }}
        >
          Save Changes
        </button>
      </div> */}

      {/* ── MANAGE DATABASE ─────────────────────────────────────── */}
      {(userInfo?.departmentID === 16 || userInfo?.departmentID === 8) && <div className="widget-container">
        <h2
          style={{
            textTransform: "uppercase",
            marginBottom: "20px",
          }}
        >
          Manage Database
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {DATABASE_TILES.map((tile) => (
            <div
              key={tile.label}
              style={{
                backgroundColor: "rgba(248,249,251,1)",
                borderRadius: "12px",
                padding: "20px",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: "16px",
              }}
            >
              {/* Icon + label stacked */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                }}
              >
                <img
                  src="/icons/database-folder.svg"
                  alt=""
                  style={{ width: "48px", height: "48px" }}
                />
                <span style={{ fontSize: "13px", fontWeight: "500" }}>
                  {tile.label}
                </span>
              </div>
              {/* Manage button on the right */}
              <Button
                componentType="link"
                bgColor="white"
                borderColor="rgba(216, 216, 216, 1)"
                textColor="black"
                href={tile.href}
                style={{ borderRadius: "50px", whiteSpace: "nowrap" }}
              >
                MANAGE &gt;
              </Button>
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}
