"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./DropdownMenu.module.css";

export type DropdownMenuItem = {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
};

type DropdownMenuProps = {
  items: DropdownMenuItem[];
};

export default function DropdownMenu({ items }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  function toggleOpen() {
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.right - 140, // align right edge of menu (140px wide) with button
      });
    }
    setIsOpen((prev) => !prev);
  }

  function handleItemClick(item: DropdownMenuItem) {
    setIsOpen(false);
    item.onClick();
  }

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className={styles.trigger}
        onClick={toggleOpen}
        aria-label="Open menu"
        aria-expanded={isOpen}
      >
        ⋮
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className={styles.menu}
            role="menu"
            style={{ position: "fixed", top: position.top, left: position.left }}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={`${styles.menuItem} ${item.variant === "danger" ? styles.danger : ""}`}
                onClick={() => handleItemClick(item)}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
}