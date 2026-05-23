"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Login from "./components/Login";
import { useAuth } from "./context/AuthContext";
import LoadingSpinner from "./components/LoadingSpinner";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <LoadingSpinner size={32} style={{ minHeight: "100vh" }} />;
  }

  if (isAuthenticated) {
    return null;
  }

  return <Login />;
}
