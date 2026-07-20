"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import styles from "../signup/signup.module.css";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await api.forgotPasswordOtp(email);
      showToast("If that email is registered, a code has been sent", "success");
      sessionStorage.setItem("reset_email", email);
      router.push("/forgot-password/verify");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <h1 className={styles.title}>Forgot password</h1>

        <label className={styles.label}>Email</label>
        <input
          className={styles.input}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send reset code"}
        </button>

        <p className={styles.linkText}>
          <a href="/login">Back to login</a>
        </p>
      </form>
    </div>
  );
}