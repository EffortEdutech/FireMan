"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendRequestAccessCode, verifyRequestAccessCode } from "@/app/(public)/request/actions";
import { Button } from "@/components/ui/button";

const inputStyle = { minHeight: 44, border: "1px solid var(--border)", borderRadius: 6, padding: 12, width: "100%" };

export function RequestAccessForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function send() {
    setBusy(true);
    const result = await sendRequestAccessCode(email);
    setMessage(result.message);
    setSent(result.ok);
    setBusy(false);
  }

  async function verify() {
    setBusy(true);
    const result = await verifyRequestAccessCode(email, token);
    setMessage(result.message);
    setBusy(false);
    if (result.ok) router.push(nextPath);
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <label>Email address<input type="email" autoComplete="email" required value={email} onChange={(event) => { setEmail(event.target.value); setSent(false); }} style={inputStyle} /></label>
      <Button type="button" onClick={send} disabled={busy}>{busy ? "Please wait…" : sent ? "Send another code" : "Email me a code"}</Button>
      {sent ? <label>Six-digit code<input inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={token} onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 6))} style={inputStyle} /></label> : null}
      {sent ? <Button type="button" variant="secondary" onClick={verify} disabled={busy || token.length !== 6}>{busy ? "Checking…" : "Verify and continue"}</Button> : null}
      {message ? <p role="status" aria-live="polite">{message}</p> : null}
    </div>
  );
}
