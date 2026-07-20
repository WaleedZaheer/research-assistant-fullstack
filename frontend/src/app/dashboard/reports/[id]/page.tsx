"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { api, streamReport } from "@/lib/api";
import styles from "./report.module.css";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
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
  const reportId = Number(params.id);
  const { showToast } = useToast();
  const pendingTextRef = useRef("");
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [error, setError] = useState("");
  const [progressMessage, setProgressMessage] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const streamStarted = useRef(false);
  const confirm = useConfirm();

  const loadReport = useCallback(async () => {
    try {
      const data = await api.getReport(reportId);
      setReport(data);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load report";
      console.trace("ReportDetail setError (loadReport):", message);
      setError(message);
      return null;
    }
  }, [reportId]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);
  useEffect(() => {
  const interval = setInterval(() => {
    if (pendingTextRef.current.length > 0) {
      const nextChunk = pendingTextRef.current.slice(0, 3);
      pendingTextRef.current = pendingTextRef.current.slice(3);
      setStreamingText((prev) => prev + nextChunk);
    }
  }, 20);

  return () => clearInterval(interval);
}, []);

  useEffect(() => {
    if (!report || streamStarted.current) return;
    if (report.status !== "pending") return;

    streamStarted.current = true;

streamReport(reportId, (event) => {
  if (event.type === "progress") {
    setProgressMessage(event.message || "");
  } else if (event.type === "token") {
    pendingTextRef.current += event.text || "";
  } else if (event.type === "done") {
    loadReport();
  } else if (event.type === "error") {
    const message = event.message || "Something went wrong";
    console.trace("ReportDetail setError (stream event):", message, event);
    setError(message);
  }
}).catch((err) => {
      const message = err instanceof Error ? err.message : "Stream failed";
      console.trace("ReportDetail setError (stream.catch):", message);
      setError(message);
    });
  }, [report, reportId, loadReport]);
async function handleDelete() {
  const confirmed = await confirm({
    title: "Delete this report?",
    message: "This action can't be undone.",
  });

  if (!confirmed) return;

  setDeleting(true);
  try {
    await api.deleteReport(reportId);
    showToast("Report deleted", "success");
    router.push("/dashboard");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete report";
    console.trace("ReportDetail setError (delete):", message);
    setError(message);
    showToast(message, "error");
    setDeleting(false);
  }
}

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!report) {
    return <p className={styles.muted}>Loading...</p>;
  }

  if (report.status === "failed") {
    return (
      <div className={styles.statusScreen}>
        <p className={styles.errorText}>This report failed to generate.</p>
        <p className={styles.muted}>Topic: {report.topic}</p>
      </div>
    );
  }

  if (report.status === "pending") {
    return (
      <div>
        <h1 className={styles.pageTitle}>{report.topic}</h1>
       {progressMessage && !streamingText && (
  <div className={styles.progressRow}>
    <span className={styles.progressIcon}>✳</span>
    <span key={progressMessage} className={styles.progressText}>{progressMessage}</span>
  </div>
)}
        {streamingText && (
          <div className={styles.content}>
            {streamingText}
            <span className={styles.cursor}>▍</span>
          </div>
        )}
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