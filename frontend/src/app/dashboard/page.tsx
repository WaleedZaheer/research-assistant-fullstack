"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./dashboard.module.css";

export default function DashboardPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.getProfile()
      .then((data) => setUsername(data.username))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError("");

    try {
      const newReport = await api.createReport(topic);
      router.push(`/dashboard/reports/${newReport.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create report";
      console.trace("Dashboard setError:", message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.centerScreen}>
      <h1 className={styles.greeting}>Hi, {username || "there"}</h1>
      <p className={styles.subtext}>What would you like to research today?</p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          className={styles.input}
          type="text"
          placeholder="Enter your research topic here"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          autoFocus
        />
        <button className={styles.submitButton} type="submit" disabled={loading}>
          {loading ? "Starting..." : "Generate Report"}
        </button>
      </form>

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}