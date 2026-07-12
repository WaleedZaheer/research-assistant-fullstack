"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./Sidebar.module.css";

interface Report {
  id: number;
  topic: string;
  status: string;
}

export default function Sidebar() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      const data = await api.getReports();
      setReports(data.results);
      setNextPage(data.next);
    } catch {
      // Silently ignore — sidebar just shows empty list if this fails
    }
  }

  async function loadMore() {
    if (!nextPage) return;
    setLoadingMore(true);
    try {
      const response = await fetch(nextPage);
      const data = await response.json();
      setReports((prev) => [...prev, ...data.results]);
      setNextPage(data.next);
    } catch {
      // Ignore — user can just try again
    } finally {
      setLoadingMore(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    router.push("/login");
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>Research Assistant</div>

      <button className={styles.newReportButton} onClick={() => router.push("/dashboard")}>
        + New Report
      </button>

      <nav className={styles.history}>
        <div className={styles.historyLabel}>Recent</div>
        {reports.map((report) => (
          <a
            key={report.id}
            href={`/dashboard/reports/${report.id}`}
            className={styles.historyItem}
          >
            <span className={`${styles.statusDot} ${styles[`dot_${report.status}`]}`}></span>
            <span className={styles.historyText}>{report.topic}</span>
          </a>
        ))}

        {nextPage && (
          <button className={styles.loadMoreButton} onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        )}
      </nav>

      <button className={styles.logoutButton} onClick={handleLogout}>
        Logout
      </button>
    </aside>
  );
}