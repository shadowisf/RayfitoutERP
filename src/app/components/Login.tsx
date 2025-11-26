"use client";

import { useState } from "react";
import InputItem from "./InputItem";
import Button from "./Button";
import { login, completeNewPassword } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";

export default function Login() {
  const logo = "/icons/logo.svg";
  const backgroundImg = "/images/hq.jpg";

  const router = useRouter();
  const { checkAuth } = useAuth();

  const [userID, setUserID] = useState("");
  const [password, setPassword] = useState("");

  const [isNewPasswordRequired, setIsNewPasswordRequired] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [name, setName] = useState("");
  const [cognitoUser, setCognitoUser] = useState<any>(null);
  const [userAttributes, setUserAttributes] = useState<any>({});

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: any) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result: any = await login(userID, password);

      if (result.status === "NEW_PASSWORD_REQUIRED") {
        setCognitoUser(result.user);
        setUserAttributes(result.userAttributes || {});
        setIsNewPasswordRequired(true);
        setLoading(false);
        return;
      }

      if (result.status === "SUCCESS") {
        // Re-check auth before redirecting
        await checkAuth();
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleNewPassword(e: any) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!cognitoUser) {
      setError("Session expired. Please log in again.");
      setLoading(false);
      return;
    }

    try {
      const updatedAttributes = {
        ...userAttributes,
        name: name,
      };

      await completeNewPassword(cognitoUser, newPassword, updatedAttributes);

      // Re-check auth before redirecting
      await checkAuth();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Password update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="left">
        <img
          className="background-image"
          src={backgroundImg}
          alt="rayfitout headquarters"
        />
      </div>

      <div className="right">
        <div className="title">
          <img className="logo" src={logo} alt="logo" />
          <h2>PROCUREMENT MANAGEMENT</h2>
        </div>

        <br />
        <br />

        {error && <p style={{ color: "red", marginBottom: "20px" }}>{error}</p>}

        <div className="form-inner-container">
          {!isNewPasswordRequired && (
            <form className="form-inner-container" onSubmit={handleSubmit}>
              <div className="input-row">
                <InputItem
                  placeholder="ENTER EMAIL"
                  type="text"
                  value={userID}
                  onChange={(e) => setUserID(e.target.value)}
                  label={"EMAIL"}
                  required
                  disabled={loading}
                />
              </div>

              <div className="input-row">
                <InputItem
                  placeholder="ENTER PASSWORD"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  label={"PASSWORD"}
                  required
                  disabled={loading}
                />
              </div>

              <div className="input-row">
                <Button
                  componentType={"button"}
                  type="submit"
                  bgColor={"black"}
                  borderColor={"black"}
                  textColor={"white"}
                  full
                >
                  {loading ? "LOGGING IN..." : "LOGIN"}
                </Button>
              </div>
            </form>
          )}

          {isNewPasswordRequired && (
            <form className="form-inner-container" onSubmit={handleNewPassword}>
              <h3 style={{ marginBottom: "10px" }}>SET A NEW PASSWORD</h3>
              <p
                style={{
                  marginBottom: "20px",
                  fontSize: "14px",
                  color: "#666",
                }}
              >
                Please create a new password and enter your name to continue.
              </p>

              <div className="input-row">
                <InputItem
                  placeholder="ENTER FULL NAME"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  label={"FULL NAME"}
                  required
                  disabled={loading}
                />
              </div>

              <div className="input-row">
                <InputItem
                  placeholder="ENTER NEW PASSWORD"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  label={"NEW PASSWORD"}
                  required
                  disabled={loading}
                />
              </div>

              <div className="input-row">
                <Button
                  componentType={"button"}
                  type="submit"
                  bgColor={"black"}
                  borderColor={"black"}
                  textColor={"white"}
                  full
                >
                  {loading ? "UPDATING..." : "UPDATE PASSWORD"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
