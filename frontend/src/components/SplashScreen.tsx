"use client";

import { useEffect, useState } from "react";
import styles from "./SplashScreen.module.css";

export default function SplashScreen({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className={styles.splash}>
        <div className={styles.logo}>Research Assistant</div>
        <div className={styles.dot}></div>
      </div>
    );
  }

  return <>{children}</>;
}