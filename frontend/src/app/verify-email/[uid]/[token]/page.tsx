"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import styles from "../../../signup/signup.module.css";

export default function VerifyEmailPage() {
  const params = useParams<{ uid: string; token: string }>();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    verify();
  }, []);

  async function verify() {
    try {
      const data = await api.verifyEmail(params.uid, params.token);
      setMessage(data.detail || "Email verified successfully.");
      setStatus("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Verification failed. The link may be invalid or expired.";
      setMessage(msg);
      setStatus("error");
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Email verification</h1>

        {status === "loading" && <p className={styles.linkText}>Verifying your email...</p>}

        {status === "success" && (
          <>
            <p className={styles.linkText}>{message}</p>
            <p className={styles.linkText}>
              <a href="/login">Go to login</a>
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className={styles.error}>{message}</div>
            <p className={styles.linkText}>
              <a href="/login">Back to login</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}