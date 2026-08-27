"use client";

import { useEffect } from "react";

export default function SiteProtection() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // F12
      if (e.key === "F12") {
        e.preventDefault();
        return;
      }

      // Ctrl/Cmd + Shift + I
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "i") {
        e.preventDefault();
        return;
      }

      // Ctrl/Cmd + Shift + J
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && key === "j") {
        e.preventDefault();
        return;
      }

      // Ctrl/Cmd + U
      if ((e.ctrlKey || e.metaKey) && key === "u") {
        e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}