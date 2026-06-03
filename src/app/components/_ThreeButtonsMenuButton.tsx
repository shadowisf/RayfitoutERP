"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

type props = {
  children: React.ReactNode;
};

export default function ThreeDotsMenuButton({ children }: props) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    right: number;
  } | null>(null);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const threeDotIcon = "/icons/three-dots.svg";

  // Recalculate position whenever the menu opens
  const recalcPos = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;

      // If a modal/popup is open, don't close the menu
      const hasOpenModal = document.querySelector(
        ".popup-overlay, .form-popup, .modal-overlay, .form-outer-container",
      );
      if (hasOpenModal) return;

      // Don't close if clicking inside dropdown portal
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;

      const isClickOnDropdown = target.closest(".select-dropdown-portal");
      if (isClickOnDropdown) return;

      // Close if clicking outside the button
      if (buttonRef.current && !buttonRef.current.contains(target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 0);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Reposition on scroll or resize while open
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => recalcPos();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
  }, [isOpen]); // eslint-disable-line

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={buttonRef}
        onClick={() => {
          const opening = !isOpen;
          if (opening) recalcPos();
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
        Portal the dropdown to <body> so no parent overflow:hidden can clip it.
        Keep children mounted after first open (hasBeenOpened) so their modal
        state survives. height:0 + overflow:hidden hides the dropdown visually
        but does NOT clip position:fixed descendants (e.g. FormPopup overlay).
      */}
      {hasBeenOpened &&
        dropdownPos !== null &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            onClick={() => setIsOpen(false)}
            className="three-dots-dropdown"
            style={{
              position: "fixed",
              top: dropdownPos.top,
              right: dropdownPos.right,
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
          </div>,
          document.body,
        )}
    </div>
  );
}
