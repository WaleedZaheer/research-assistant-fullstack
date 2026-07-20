"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./signup.module.css";
import { useToast } from "@/context/ToastContext";
import OtpInput from "@/components/OtpInput";
import { useResendTimer } from "@/hooks/useResendTimer";

type Step = "form" | "otp";

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("form");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; email?: string; password?: string }>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpError, setOtpError] = useState(false);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const { showToast } = useToast();
  const { secondsLeft, canResend, start } = useResendTimer(60);

  function validate() {
    const errors: { username?: string; email?: string; password?: string } = {};

    if (!username.trim()) errors.username = "Please enter a username";

    if (!email.trim()) {
      errors.email = "Please enter your email";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email";
    }

    if (!password.trim()) {
      errors.password = "Please enter a password";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setLoading(true);
    try {
      await api.signup(username, email, password);
      showToast("Account created — check your email for a code", "success");
      start();
      setStep("otp");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpComplete(code: string) {
    setOtpError(false);
    setOtpSubmitting(true);
    try {
      await api.verifyEmailOtp(email, code);
      showToast("Email verified — please log in", "success");
      router.push("/login");
    } catch (err) {
      setOtpError(true);
      const message = err instanceof Error ? err.message : "Invalid or expired code";
      showToast(message, "error");
    } finally {
      setOtpSubmitting(false);
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

  return (
    <div className={styles.container}>
      <div className={`${styles.stepWrapper} ${step === "otp" ? styles.stepOtpActive : ""}`}>
        <form className={`${styles.card} ${styles.stepForm}`} onSubmit={handleSubmit} noValidate>
          <h1 className={styles.title}>Create your account</h1>

          {error && <div className={styles.error}>{error}</div>}

          <label className={styles.label}>Username</label>
          <input
            className={`${styles.input} ${fieldErrors.username ? styles.inputError : ""}`}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {fieldErrors.username && <span className={styles.fieldError}>{fieldErrors.username}</span>}

          <label className={styles.label}>Email</label>
          <input
            className={`${styles.input} ${fieldErrors.email ? styles.inputError : ""}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {fieldErrors.email && <span className={styles.fieldError}>{fieldErrors.email}</span>}

          <label className={styles.label}>Password</label>
          <input
            className={`${styles.input} ${fieldErrors.password ? styles.inputError : ""}`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {fieldErrors.password && <span className={styles.fieldError}>{fieldErrors.password}</span>}

          <button className={styles.button} type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Sign up"}
          </button>

          <p className={styles.linkText}>
            Already have an account? <a href="/login">Log in</a>
          </p>
        </form>

        <div className={`${styles.card} ${styles.stepOtp}`}>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.linkText}>We sent a 6-digit code to {email}</p>

          <OtpInput onComplete={handleOtpComplete} disabled={otpSubmitting} error={otpError} />
          {otpError && <span className={styles.fieldError}>Incorrect or expired code.</span>}

          <button
            type="button"
            className={styles.button}
            onClick={handleResend}
            disabled={!canResend}
            style={{ marginTop: "1rem" }}
          >
            {canResend ? "Resend code" : `Resend in ${secondsLeft}s`}
          </button>
        </div>
      </div>
    </div>
  );
}