"use client";

import { useEffect, useState } from "react";

type ToastType = "success" | "error" | "warning" | "info";

let listeners: ((msg: string, type: ToastType, duration: number) => void)[] =
  [];

export function toast(
  message: string,
  type: ToastType = "success",
  duration = 3000
) {
  listeners.forEach((cb) => cb(message, type, duration));
}

function subscribe(
  cb: (msg: string, type: ToastType, duration: number) => void
) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((fn) => fn !== cb);
  };
}

export default function GlobalToast() {
  const [toasts, setToasts] = useState<
    { id: number; message: string; type: ToastType; duration: number }[]
  >([]);

  useEffect(() => {
    const unsub = subscribe((msg, type, duration) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message: msg, type, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
      }
    });

    return unsub;
  }, []);

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div
      style={{
        position: "fixed",
        top: "75px",
        right: "0",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        zIndex: 9999,
        width: "100%",
        paddingLeft: "240px",
        paddingRight: "40px",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 16px",
            borderRadius: "5px",
            color: "white",
            background:
              t.type === "success"
                ? "rgba(34, 150, 100, 1)"
                : t.type === "error"
                ? "rgba(194, 60, 60, 1)"
                : t.type === "warning"
                ? "#d97706"
                : "#2563eb",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
            minWidth: "200px",
          }}
        >
          <span>{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            style={{
              marginLeft: "12px",
              background: "transparent",
              border: "none",
              color: "white",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "16px",
              lineHeight: "1",
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
