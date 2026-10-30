"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type ActivityKind = "navigation" | "submission";

export function ActivityFeedback() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [activity, setActivity] = useState<{ kind: ActivityKind; routeKey: string } | null>(null);

  useEffect(() => {
    let clearTimer: number | null = null;

    function start(nextKind: ActivityKind) {
      if (clearTimer !== null) window.clearTimeout(clearTimer);
      setActivity({ kind: nextKind, routeKey: `${window.location.pathname}?${window.location.search.slice(1)}` });
      clearTimer = window.setTimeout(() => setActivity(null), 15000);
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement) || target.target === "_blank" || target.hasAttribute("download")) return;
      const url = new URL(target.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start("navigation");
    }

    function handleSubmit(event: SubmitEvent) {
      const form = event.target instanceof HTMLFormElement ? event.target : null;
      if (!form || form.dataset.noActivityFeedback === "true") return;
      window.setTimeout(() => {
        if (!event.defaultPrevented) start("submission");
      }, 0);
    }

    function handlePopState() {
      start("navigation");
    }

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);
    window.addEventListener("popstate", handlePopState);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      window.removeEventListener("popstate", handlePopState);
      if (clearTimer !== null) window.clearTimeout(clearTimer);
    };
  }, []);

  const active = activity !== null && activity.routeKey === routeKey;
  if (!active || !activity) return null;

  return (
    <div aria-live="polite" className="activity-feedback" role="status">
      <span className="activity-feedback-spinner" />
      <span>{activity.kind === "navigation" ? "Loading page…" : "Saving changes…"}</span>
      <span className="activity-feedback-hint">Please wait</span>
    </div>
  );
}
