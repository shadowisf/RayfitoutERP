"use client";

import { useEffect, useState } from "react";
import { useRefresh } from "@/app/context/RefreshContext";

export default function LoadingBar() {
  const { isPending } = useRefresh();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isPending) {
      setVisible(true);
      setProgress(0);

      // Quickly jump to ~70%, then slow crawl — gives a realistic feel
      const t1 = setTimeout(() => setProgress(30), 30);
      const t2 = setTimeout(() => setProgress(60), 150);
      const t3 = setTimeout(() => setProgress(75), 400);
      const t4 = setTimeout(() => setProgress(85), 900);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
      };
    } else {
      // Data is back — shoot to 100%, then fade out
      setProgress(100);
      const hide = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(hide);
    }
  }, [isPending]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        height: "3px",
        background: "transparent",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "black",
          transition:
            progress === 100
              ? "width 0.15s ease-out"
              : "width 0.4s ease-out",
          borderRadius: "0 2px 2px 0",
        }}
      />
    </div>
  );
}
