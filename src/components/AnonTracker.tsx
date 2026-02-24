"use client";

import { useEffect } from "react";
import { getOrCreateAnonId } from "@/lib/anon";

export default function AnonTracker() {
  useEffect(() => {
    const anonId = getOrCreateAnonId();
    fetch("/api/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anonId,
        event: "pageview",
        path: window.location.pathname,
      }),
    }).catch(() => {});
  }, []);

  return null;
}
