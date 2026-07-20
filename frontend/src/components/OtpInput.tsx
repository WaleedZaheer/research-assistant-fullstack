"use client";

import { useRef, useState, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import styles from "./OtpInput.module.css";

interface OtpInputProps {
  length?: number;
  onChange?: (code: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export default function OtpInput({ length = 6, onChange, onComplete, disabled, error }: OtpInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function updateValue(index: number, char: string) {
    const next = [...values];
    next[index] = char;
    setValues(next);

    if (char && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = next.join("");
    onChange?.(code);
    if (code.length === length && next.every((v) => v !== "")) {
      onComplete?.(code);
    }
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1);
    updateValue(index, digit);
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      updateValue(index - 1, "");
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;

    const next = Array(length).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setValues(next);

    const code = next.join("");
    onChange?.(code);

    const focusIndex = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIndex]?.focus();

    if (pasted.length === length) {
      onComplete?.(pasted);
    }
  }

  return (
    <div className={`${styles.otpRow} ${error ? styles.otpRowError : ""}`}>
      {values.map((val, i) => (
        <input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={val}
          disabled={disabled}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className={styles.otpBox}
        />
      ))}
    </div>
  );
}