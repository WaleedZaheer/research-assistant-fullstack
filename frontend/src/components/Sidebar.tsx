"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import styles from "./Sidebar.module.css";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import DropdownMenu from "./DropdownMenu";

interface Report {
  id: number;
  topic: string;
  status: string;
  archived: boolean;
}

export default function Sidebar() {
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [username, setUsername] = useState("");
  const confirm = useConfirm();
  const { showToast } = useToast();

  useEffect(() => {
    loadReports();
    api.getProfile().then((p) => setUsername(p.username)).catch(() => {});
  }, []);

  async function loadReports() {
    try {
      const data = await api.getReports();
      setReports(data.results ?? []);
      setNextPage(data.next ?? null);
    } catch {
      // Silently ignore — sidebar just shows empty list if this fails
    }
  }

  async function loadMore() {
    if (!nextPage) return;
    setLoadingMore(true);
    try {
      const data = await api.getReports(nextPage);
      setReports((prev) => [...prev, ...(data.results ?? [])]);
      setNextPage(data.next ?? null);
    } catch {
      // Ignore — user can just try again
    } finally {
      setLoadingMore(false);
    }
  }

  function startRename(report: Report) {
    setEditingId(report.id);
    setEditValue(report.topic);
  }

  function cancelRename() {
    setEditingId(null);
    setEditValue("");
  }

  async function submitRename(id: number) {
    const trimmed = editValue.trim();
    if (!trimmed) {
      cancelRename();
      return;
    }

    const previous = reports;
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, topic: trimmed } : r))
    );
    setEditingId(null);

    try {
      await api.updateReport(id, { topic: trimmed });
    } catch {
      setReports(previous);
      showToast("Failed to rename report", "error");
    }
  }

  async function handleArchiveToggle(report: Report) {
    const previous = reports;
    setReports((prev) =>
      prev.map((r) => (r.id === report.id ? { ...r, archived: !r.archived } : r))
    );

    try {
      await api.updateReport(report.id, { archived: !report.archived });
      showToast(report.archived ? "Report unarchived" : "Report archived", "info");
    } catch {
      setReports(previous);
      showToast("Failed to update report", "error");
    }
  }

  async function handleDelete(report: Report) {
    const confirmed = await confirm({
      title: "Delete this report?",
      message: `Delete "${report.topic}"? This can't be undone.`,
    });
    if (!confirmed) return;

    const previous = reports;
    setReports((prev) => prev.filter((r) => r.id !== report.id));

    try {
      await api.deleteReport(report.id);
      showToast("Report deleted", "info");
    } catch {
      setReports(previous);
      showToast("Failed to delete report", "error");
    }
  }

  function renderReportRow(report: Report) {
    return (
      <div key={report.id} className={styles.historyItem}>
        <span className={`${styles.statusDot} ${styles[`dot_${report.status}`]}`}></span>

        {editingId === report.id ? (
          <input
            className={styles.renameInput}
            value={editValue}
            autoFocus
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => submitRename(report.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename(report.id);
              if (e.key === "Escape") cancelRename();
            }}
          />
        ) : (
          <a href={`/dashboard/reports/${report.id}`} className={styles.historyText}>
            {report.topic}
          </a>
        )}

        <DropdownMenu
          items={[
            { label: "Rename", onClick: () => startRename(report) },
            {
              label: report.archived ? "Unarchive" : "Archive",
              onClick: () => handleArchiveToggle(report),
            },
            {
              label: "Delete",
              variant: "danger",
              onClick: () => handleDelete(report),
            },
          ]}
        />
      </div>
    );
  }

  const activeReports = reports.filter((r) => !r.archived);
  const archivedReports = reports.filter((r) => r.archived);
  const initial = username ? username[0].toUpperCase() : "?";

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}>
      <div className={styles.topRow}>
        {!collapsed && <div className={styles.logo}>Research Assistant</div>}
        <button
          className={styles.collapseButton}
          onClick={() => setCollapsed((prev) => !prev)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <line x1="9" y1="4" x2="9" y2="20" />
          </svg>
        </button>
      </div>

      <button className={styles.newReportButton} onClick={() => router.push("/dashboard")}>
        {collapsed ? "+" : "+ New Report"}
      </button>

      {!collapsed && (
        <nav
          className={styles.history}
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 60 && nextPage && !loadingMore) {
              loadMore();
            }
          }}
        >
          <div className={styles.historyLabel}>Recent</div>
          {activeReports.length === 0 && (
            <div className={styles.emptyLabel}>No reports yet</div>
          )}
          {activeReports.map(renderReportRow)}

          {archivedReports.length > 0 && (
            <>
              <button
                className={styles.historyLabel}
                onClick={() => setArchivedOpen((prev) => !prev)}
                style={{ background: "none", border: "none", cursor: "pointer", width: "100%", textAlign: "left" }}
              >
                Archived ({archivedReports.length}) {archivedOpen ? "▾" : "▸"}
              </button>
              {archivedOpen && archivedReports.map(renderReportRow)}
            </>
          )}
        </nav>
      )}

      {collapsed && <div style={{ flex: 1 }} />}

      <button className={styles.avatarButton} onClick={() => router.push("/dashboard/profile")}>
        <div className={styles.avatarTopRow}>
          <span className={styles.avatarCircle}>{initial}</span>
          {!collapsed && <span className={styles.avatarName}>{username || "Profile"}</span>}
        </div>
        {!collapsed && <span className={styles.avatarSubtext}>Account</span>}
      </button>
    </aside>
  );
}