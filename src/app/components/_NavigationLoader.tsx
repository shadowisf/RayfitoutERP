"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import LpoDetailSkeleton from "@/app/(protected)/mr/[id]/loading";

function getSkeletonForPath(pathname: string): React.ReactNode | null {
  if (/^\/mr\/\d+/.test(pathname)) return <LpoDetailSkeleton />;
  return null;
}

export default function NavigationLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const [overlay, setOverlay] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    // Skip on first mount — SSR already handled initial render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const skeleton = getSkeletonForPath(pathname);

    if (!skeleton) {
      // Non-skeleton page: clear any lingering overlay immediately
      setOverlay(null);
      return;
    }

    // Show skeleton overlay, hide real content
    setOverlay(skeleton);

    let settled = false;

    function resolve() {
      if (settled) return;
      settled = true;
      window.removeEventListener("page-client-ready", resolve);
      clearTimeout(fallback);
      setOverlay(null);
    }

    window.addEventListener("page-client-ready", resolve);
    // Safety net: never block indefinitely
    const fallback = setTimeout(resolve, 8000);

    return () => {
      window.removeEventListener("page-client-ready", resolve);
      clearTimeout(fallback);
    };
  }, [pathname]);

  return (
    <>
      {overlay}
      <div style={{ display: overlay ? "none" : "block" }}>{children}</div>
    </>
  );
}
