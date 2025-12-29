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
};

export default function FormPopUp({
  header,
  setIsOpen,
  handleSubmit,
  addButtonLabel,
  children,
  style,
  secondButton,
}: FormPopUpProps) {
  const cross_icon = "/icons/cross.svg";

  const [isLoading, setIsLoading] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const checkValidity = () => {
      const isValid = form.checkValidity();
      setIsFormValid(isValid);
    };

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
  }, [children]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

  const handleClose = () => {
    if (isLoading) return;
    setIsOpen(false);
  };

  return (
    <div className="form-outer-container">
      <div
        className="form-inner-container"
        style={{
          ...style,
          pointerEvents: isLoading ? "none" : "auto",
        }}
      >
        <div className="form-header">
          <h2>{header}</h2>

          <img
            src={cross_icon}
            alt="cross"
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

        {handleSubmit ? (
          <form ref={formRef} onSubmit={onSubmit}>
            <fieldset
              disabled={isLoading}
              style={{
                border: "none",
                padding: 0,
                margin: 0,
              }}
            >
              <div className="form-content">{children}</div>

              {addButtonLabel && (
                <>
                  <br />
                  <br />

                  <div className="button-container">
                    {secondButton}

                    <Button
                      componentType={"button"}
                      bgColor={"black"}
                      borderColor={"black"}
                      textColor={"white"}
                      type="submit"
                      disabled={!isFormValid || isLoading}
                      style={{
                        cursor:
                          isFormValid && !isLoading ? "pointer" : "not-allowed",
                        opacity: isFormValid && !isLoading ? 1 : 0.5,
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
            </fieldset>
          </form>
        ) : (
          <div>
            <div className="form-content">{children}</div>

            {addButtonLabel && (
              <>
                <br />
                <br />

                <div className="button-container">
                  {secondButton}

                  <Button
                    componentType={"button"}
                    bgColor={"black"}
                    borderColor={"black"}
                    textColor={"white"}
                    type="submit"
                  >
                    {addButtonLabel}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
