import { useState, useRef, useEffect } from "react";

type props = {
  children: React.ReactNode;
};

export default function ThreeDotsMenuButton({ children }: props) {
  const [isOpen, setIsOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const threeDotIcon = "/icons/three-dots.svg";

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;

      // ✅ Check if there's any modal/popup currently open in the DOM
      const hasOpenModal = document.querySelector(
        ".popup-overlay, .form-popup, .modal-overlay",
      );

      // ✅ If modal is open, don't close the menu
      if (hasOpenModal) return;

      // ✅ Don't close if clicking inside dropdown
      const isClickOnDropdown = target.closest(".select-dropdown-portal");

      if (isClickOnDropdown) return;

      // ✅ Close menu if clicking outside
      if (menuRef.current && !menuRef.current.contains(target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      // Use timeout to ensure DOM is updated
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      ref={menuRef}
      style={{ position: "relative", display: "inline-block" }}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "8px",
        }}
      >
        <img src={threeDotIcon} alt="Menu" />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: "4px",
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            minWidth: "200px",
            zIndex: 1000,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
