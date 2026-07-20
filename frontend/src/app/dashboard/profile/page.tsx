"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import styles from "./profile.module.css";

interface ProfileData {
  username: string;
  email: string;
  total_tokens_used: number;
  session_tokens_used: number;
  session_token_limit: number;
  session_tokens_remaining: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await api.getProfile();
      setProfile(data);
      setUsername(data.username);
      setEmail(data.email);
    } catch {
      showToast("Failed to load profile", "error");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateProfile({ username, email });
      setProfile(updated);
      showToast("Profile updated", "info");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      await api.changePassword(oldPassword, newPassword);
      showToast("Password changed successfully", "success");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to change password";
      setPasswordError(message);
      showToast(message, "error");
    } finally {
      setChangingPassword(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    showToast("Logged out", "info");
    router.push("/login");
  }

  if (!profile) {
    return <div className={styles.container}>Loading...</div>;
  }

  const usagePercent = Math.min(
    (profile.session_tokens_used / profile.session_token_limit) * 100,
    100
  );

  return (
    <div className={styles.container}>
      <h1 className={styles.heading}>Profile</h1>

      <form onSubmit={handleSave} className={styles.form}>
        <label className={styles.label}>
          Username
          <input
            className={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>

        <label className={styles.label}>
          Email
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <button className={styles.saveButton} type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>

      <div className={styles.usageSection}>
        <h2 className={styles.subheading}>Token Usage</h2>

        <div className={styles.statRow}>
          <span className={styles.statLabel}>This session</span>
          <span className={styles.statValue}>
            {profile.session_tokens_used.toLocaleString()} / {profile.session_token_limit.toLocaleString()}
          </span>
        </div>

        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${usagePercent}%` }} />
        </div>

        <div className={styles.statRow}>
          <span className={styles.statLabel}>Remaining this session</span>
          <span className={styles.statValue}>{profile.session_tokens_remaining.toLocaleString()}</span>
        </div>

        <div className={styles.statRow}>
          <span className={styles.statLabel}>Total lifetime usage</span>
          <span className={styles.statValue}>{profile.total_tokens_used.toLocaleString()}</span>
        </div>

        <p className={styles.resetNote}>
          Session resets 6 hours after your first report in a new session.
        </p>
      </div>

      <div className={styles.passwordSection}>
        <h2 className={styles.subheading}>Change Password</h2>

        <form onSubmit={handleChangePassword} className={styles.form}>
          {passwordError && <div className={styles.error}>{passwordError}</div>}

          <label className={styles.label}>
            Current password
            <input
              className={styles.input}
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            New password
            <input
              className={styles.input}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>

          <label className={styles.label}>
            Confirm new password
            <input
              className={styles.input}
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>

          <button className={styles.saveButton} type="submit" disabled={changingPassword}>
            {changingPassword ? "Changing..." : "Change password"}
          </button>
        </form>
      </div>

      <button className={styles.logoutButton} onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}