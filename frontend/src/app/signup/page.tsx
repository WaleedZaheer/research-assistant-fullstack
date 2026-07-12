"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./signup.module.css";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; email?: string; password?: string }>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
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
    </div>
  );
}