import { useState, useRef, useEffect } from "react";

type props = {
  children: React.ReactNode;
};

export default function ThreeDotsMenuButton({ children }: props) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const threeDotIcon = "/icons/three-dots.svg";

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;

      // ✅ Check if there's any modal/popup currently open in the DOM
      const hasOpenModal = document.querySelector(
        ".popup-overlay, .form-popup, .modal-overlay, .form-outer-container",
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
        onClick={() => {
          const opening = !isOpen;
          setIsOpen(opening);
          if (opening) setHasBeenOpened(true);
        }}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "8px",
          marginBottom: "-5px",
        }}
      >
        <img src={threeDotIcon} alt="Menu" />
      </button>

      {/*
        Keep children mounted after first open so their modal state
        survives the menu closing. height:0 + overflow:hidden hides the
        dropdown visually but does NOT clip position:fixed descendants
        (like FormPopup's overlay), so modals still appear correctly.
      */}
      {hasBeenOpened && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: "absolute",
            right: 0,
            top: "100%",
            marginTop: "4px",
            backgroundColor: "white",
            border: isOpen ? "1px solid #e5e7eb" : "none",
            borderRadius: "12px",
            boxShadow: isOpen ? "0 4px 6px rgba(0, 0, 0, 0.1)" : "none",
            minWidth: "200px",
            zIndex: 1000,
            height: isOpen ? "auto" : 0,
            overflow: "hidden",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
