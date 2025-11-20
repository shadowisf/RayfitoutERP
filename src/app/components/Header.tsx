"use client";

import NewProjectButton from "./NewProjectButton";

export default function Header() {
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
          <img src={logo_icon} alt="rayfitout logo" />

          <p>PROCUREMENT MANAGEMENT</p>

          <div>
            <form>
              <input
                type="text"
                placeholder="Search MR / Item / Project"
                onChange={(e) => handleSearch(e.target.value)}
              />
              <img src={search_icon} alt="search" />
            </form>
          </div>
        </div>

        <div className="right">
          <button className="notifications">
            <img src={notification_icon} alt="notification icon" />
          </button>

          <button className="new-mr">+ NEW MR</button>

          <NewProjectButton />

          <p>DEPARTMENT</p>
        </div>
      </div>
    </>
  );
}
