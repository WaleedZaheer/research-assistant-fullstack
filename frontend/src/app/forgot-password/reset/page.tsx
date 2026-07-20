"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import styles from "../../signup/signup.module.css";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("reset_email");
    const storedCode = sessionStorage.getItem("reset_code");
    if (!storedEmail || !storedCode) {
      router.push("/forgot-password");
      return;
    }
    setEmail(storedEmail);
    setCode(storedCode);
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }

    setLoading(true);
    try {
      await api.resetPasswordOtp(email, code, newPassword);
      sessionStorage.removeItem("reset_email");
      sessionStorage.removeItem("reset_code");
      showToast("Password reset — please log in", "success");
      router.push("/login");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setPasswordError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  if (!email) return null;

  return (
    <div className={styles.container}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <h1 className={styles.title}>Set a new password</h1>

        {passwordError && <div className={styles.error}>{passwordError}</div>}

        <label className={styles.label}>New password</label>
        <input
          className={styles.input}
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />

        <label className={styles.label}>Confirm password</label>
        <input
          className={styles.input}
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />

        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? "Resetting..." : "Reset password"}
        </button>
      </form>
    </div>
  );
}