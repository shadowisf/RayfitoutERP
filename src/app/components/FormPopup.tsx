"use client";

import { useState, useEffect, useRef } from "react";
import Button from "./Button";

type FormPopUpProps = {
  header: string | React.ReactNode;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleSubmit?: (e: React.FormEvent) => void | Promise<void>;
  children: React.ReactNode;
  addButtonLabel?: string;
  style?: React.CSSProperties;
  secondButton?: React.ReactNode;
  stickyFooter?: React.ReactNode;
  haveLoadingState?: boolean;
};

export default function FormPopUp({
  header,
  setIsOpen,
  handleSubmit,
  addButtonLabel,
  children,
  style,
  secondButton,
  stickyFooter,
  haveLoadingState = false,
}: FormPopUpProps) {
  const cross_icon = "/icons/cross.svg";

  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [isOpening, setIsOpening] = useState(true);

  // ── Mobile detection ───────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // ── Drag-to-dismiss state (mobile only) ───────────────────────────────────
  const [translateY, setTranslateY] = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsOpening(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Lock background scroll while modal is open
  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const checkValidity = () => setIsFormValid(form.checkValidity());

    checkValidity();

    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      input.addEventListener("input", checkValidity);
      input.addEventListener("change", checkValidity);
    });

    return () => {
      inputs.forEach((input) => {
        input.removeEventListener("input", checkValidity);
        input.removeEventListener("change", checkValidity);
      });
    };
  }, [children, isOpening]);

  // ── Dismiss helpers ────────────────────────────────────────────────────────
  const dismiss = () => {
    if (isLoading) return;
    if (isMobile) {
      setIsDismissing(true);
      setTimeout(() => setIsOpen(false), 260);
    } else {
      setIsOpen(false);
    }
  };

  const handleClose = () => dismiss();

  // ── Touch handlers — mobile only ──────────────────────────────────────────
  function onHandleTouchStart(e: React.TouchEvent) {
    if (!isMobile || isLoading) return;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    setIsSnapping(false);
  }

  function onHandleTouchMove(e: React.TouchEvent) {
    if (!isMobile) return;
    const delta = e.touches[0].clientY - touchStartY.current;
    if (delta <= 0) return; // block upward drag
    setTranslateY(delta);
  }

  function onHandleTouchEnd() {
    if (!isMobile) return;
    const elapsed = Math.max(1, Date.now() - touchStartTime.current);
    const velocity = translateY / elapsed; // px / ms

    if (translateY > 120 || velocity > 0.4) {
      dismiss();
    } else {
      // Snap back with a spring
      setIsSnapping(true);
      setTranslateY(0);
      setTimeout(() => setIsSnapping(false), 350);
    }
  }

  // ── Sheet transform style — mobile only ───────────────────────────────────
  const sheetTransform = isMobile
    ? isDismissing
      ? "translateY(110%)"
      : translateY > 0
        ? `translateY(${translateY}px)`
        : undefined
    : undefined;

  const sheetTransition = isMobile
    ? isDismissing
      ? "transform 0.26s cubic-bezier(0.32, 0.72, 0, 1)"
      : isSnapping
        ? "transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)"
        : "none"
    : undefined;

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!handleSubmit || isLoading || !isFormValid) return;

    setIsLoading(true);

    try {
      await handleSubmit(e);
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // ── Content blocks (shared between form / no-form paths) ──────────────────
  const footerBlock = (
    <div className="form-footer-block" style={{ marginTop: "auto", flexShrink: 0 }}>
      {stickyFooter && (
        <div style={{ paddingTop: "25px" }}>{stickyFooter}</div>
      )}
      {addButtonLabel && (
        <>
          {/* <br />
          <br /> */}
          <div className="button-container">
            {secondButton}
            <Button
              componentType={"button"}
              bgColor={"black"}
              borderColor={"black"}
              textColor={"white"}
              type="submit"
              disabled={!!handleSubmit && (!isFormValid || isLoading)}
              style={{
                cursor: isLoading ? "not-allowed" : isFormValid ? "pointer" : "not-allowed",
                opacity: isLoading ? 1 : isFormValid ? 1 : 0.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                transition: "opacity 0.2s ease",
                pointerEvents: isLoading ? "none" : "auto",
                minWidth: "120px",
              }}
            >
              {isLoading ? (
                <>
                  <div
                    style={{
                      width: "16px",
                      height: "16px",
                      border: "2px solid white",
                      borderTop: "2px solid transparent",
                      borderRadius: "50%",
                      animation: "spin 0.6s linear infinite",
                    }}
                  />
                  LOADING
                </>
              ) : (
                addButtonLabel
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div
      className="form-outer-container"
      onClick={(e) => { if (isMobile && e.target === e.currentTarget) dismiss(); }}
    >
      <div
        className="form-inner-container"
        style={{
          ...style,
          pointerEvents: isLoading ? "none" : "auto",
          ...(sheetTransform  !== undefined && { transform: sheetTransform }),
          ...(sheetTransition !== undefined && { transition: sheetTransition }),
        }}
      >
        {/* Drag handle — mobile only, activates drag-to-dismiss */}
        {isMobile && (
          <div
            className="sheet-handle"
            onTouchStart={onHandleTouchStart}
            onTouchMove={onHandleTouchMove}
            onTouchEnd={onHandleTouchEnd}
          />
        )}

        <div className="form-header">
          <h2>{header}</h2>

          {/* Cross icon — hidden on mobile via CSS, kept on desktop */}
          <img
            src={cross_icon}
            alt="close"
            className="form-close-btn"
            style={{
              cursor: isLoading ? "not-allowed" : "pointer",
              opacity: isLoading ? 0.5 : 1,
              pointerEvents: isLoading ? "none" : "auto",
            }}
            onClick={handleClose}
          />
        </div>

        <br />
        <br />

        {isOpening && haveLoadingState ? (
          <div style={{ flex: 1 }} />
        ) : isOpening ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "120px",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                border: "3px solid rgba(0,0,0,0.12)",
                borderTop: "3px solid black",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
          </div>
        ) : handleSubmit ? (
          <form
            ref={formRef}
            onSubmit={onSubmit}
            style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
          >
            <fieldset
              disabled={isLoading}
              style={{ border: "none", padding: 0, margin: 0, flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
            >
              <div className="form-content">{children}</div>
              {(stickyFooter || addButtonLabel) && footerBlock}
            </fieldset>
          </form>
        ) : (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div className="form-content">{children}</div>
            {(stickyFooter || addButtonLabel) && footerBlock}
          </div>
        )}
      </div>
    </div>
  );
}
