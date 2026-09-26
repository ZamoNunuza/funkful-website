"use client";

import { useEffect } from "react";

export default function InboxRefresh() {
  useEffect(() => {
    const interval = window.setInterval(() => {
      window.location.reload();
    }, 15000);

    return () => window.clearInterval(interval);
  }, []);

  return null;
}
