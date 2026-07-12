"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./report.module.css";

interface Source {
  id: number;
  url: string;
  title: string;
  summary: string;
}

interface ReportDetail {
  id: number;
  topic: string;
  status: string;
  content: string | null;
  created_at: string;
  completed_at: string | null;
  sources: Source[];
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const reportId = Number(params.id);

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  const loadReport = useCallback(async () => {
    try {
      const data = await api.getReport(reportId);
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    }
  }, [reportId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  useEffect(() => {
    if (!report) return;
    if (report.status === "done" || report.status === "failed") return;

    const interval = setInterval(() => {
      loadReport();
    }, 3000);

    return () => clearInterval(interval);
  }, [report, loadReport]);

  async function handleDelete() {
    if (!confirm("Delete this report? This can't be undone.")) return;

    setDeleting(true);
    try {
      await api.deleteReport(reportId);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete report");
      setDeleting(false);
    }
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!report) {
    return <p className={styles.muted}>Loading...</p>;
  }

  if (report.status === "pending" || report.status === "processing") {
    return (
      <div className={styles.statusScreen}>
        <div className={styles.spinner}></div>
        <p className={styles.statusText}>
          {report.status === "pending" ? "Starting up..." : "Researching your topic..."}
        </p>
        <p className={styles.muted}>Topic: {report.topic}</p>
      </div>
    );
  }

  if (report.status === "failed") {
    return (
      <div className={styles.statusScreen}>
        <p className={styles.errorText}>This report failed to generate.</p>
        <p className={styles.muted}>Topic: {report.topic}</p>
        <button className={styles.deleteButton} onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>{report.topic}</h1>
        <button className={styles.deleteButton} onClick={handleDelete} disabled={deleting}>
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      <div className={styles.content}>
        {report.content}
      </div>

      <h2 className={styles.sectionTitle}>Sources</h2>
      <div className={styles.sourcesList}>
        {report.sources.map((source) => (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sourceCard}
          >
            <span className={styles.sourceTitle}>{source.title}</span>
            <span className={styles.sourceUrl}>{source.url}</span>
          </a>
        ))}
      </div>
    </div>
  );
}