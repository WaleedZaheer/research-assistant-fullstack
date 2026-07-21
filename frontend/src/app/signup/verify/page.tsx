"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import OtpInput from "@/components/OtpInput";
import { useResendTimer } from "@/hooks/useResendTimer";
import styles from "../signup.module.css";

export default function VerifySignupOtpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const { showToast } = useToast();
  const { secondsLeft, canResend, start } = useResendTimer(60);

  useEffect(() => {
    const stored = sessionStorage.getItem("verify_email");
    if (!stored) {
      router.push("/signup");
      return;
    }
    setEmail(stored);
    start();
  }, [router, start]);

  async function handleVerify() {
    if (code.length !== 6) return;
    setOtpError(false);
    setLoading(true);
    try {
      await api.verifyEmailOtp(email, code);
      sessionStorage.removeItem("verify_email");
      showToast("Email verified — please log in", "success");
      router.push("/login");
    } catch (err) {
      setOtpError(true);
      const message = err instanceof Error ? err.message : "Invalid or expired code";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!canResend) return;
    try {
      await api.sendVerifyOtp(email);
      showToast("Code resent", "success");
      start();
    } catch {
      showToast("Couldn't resend code — try again shortly", "error");
    }
  }

  if (!email) return null;

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Check your email</h1>
        <p className={styles.linkText}>We sent a 6-digit code to {email}</p>

        <OtpInput onChange={setCode} disabled={loading} error={otpError} />
        {otpError && <span className={styles.fieldError}>Incorrect or expired code.</span>}

        <button
          className={styles.button}
          onClick={handleVerify}
          disabled={loading || code.length !== 6}
        >
          {loading ? "Verifying..." : "Verify"}
        </button>

        <button
          type="button"
          className={styles.button}
          onClick={handleResend}
          disabled={!canResend}
          style={{ marginTop: "0.5rem", backgroundColor: "transparent", border: "1px solid var(--border-color)" }}
        >
          {canResend ? "Resend code" : `Resend in ${secondsLeft}s`}
        </button>
      </div>
    </div>
  );
}