"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import styles from "../signup/signup.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  function validate() {
    const errors: { username?: string; password?: string } = {};
    if (!username.trim()) errors.username = "Please enter your username";
    if (!password.trim()) errors.password = "Please enter your password";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setLoading(true);
    try {
      const data = await api.login(username, password);
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      showToast("Logged in successfully", "success");
      router.push("/dashboard");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <h1 className={styles.title}>Log in</h1>

        {error && <div className={styles.error}>{error}</div>}

        <label className={styles.label}>Username</label>
        <input
          className={`${styles.input} ${fieldErrors.username ? styles.inputError : ""}`}
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {fieldErrors.username && <span className={styles.fieldError}>{fieldErrors.username}</span>}

        <label className={styles.label}>Password</label>
        <input
          className={`${styles.input} ${fieldErrors.password ? styles.inputError : ""}`}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {fieldErrors.password && <span className={styles.fieldError}>{fieldErrors.password}</span>}

        <p className={styles.linkText}>
          <a href="/forgot-password">Forgot password?</a>
        </p>

        <button className={styles.button} type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p className={styles.linkText}>
          Don&apos;t have an account? <a href="/signup">Sign up</a>
        </p>
      </form>
    </div>
  );
}