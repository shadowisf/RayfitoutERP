"use client";

import Button from "./Button";
import NewProjectButton from "./_NewProjectButton";

export default function Navbar() {
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
          <a href="/" className="logo-link">
            <img src={logo_icon} alt="rayfitout logo" />
          </a>

          <span>PROCUREMENT MANAGEMENT</span>

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

          <Button
            componentType={"button"}
            bgColor={"rgba(239, 239, 239, 1)"}
            borderColor={"rgba(239, 239, 239, 1)"}
            textColor={"black"}
            onClick={() => {}}
          >
            + NEW MR
          </Button>

          <NewProjectButton />

          <span>DEPARTMENT</span>
        </div>
      </div>
    </>
  );
}
