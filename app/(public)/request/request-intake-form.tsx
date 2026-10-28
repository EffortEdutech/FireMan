"use client";

import { useState } from "react";
import { createPublicServiceRequest, sendPublicRequestOtp, verifyPublicRequestOtp } from "@/app/(public)/request/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { serviceRequestCategoryLabels, serviceRequestUrgencyLabels } from "@/lib/service-requests/constants";

const fieldStyle = { minHeight: 44, border: "1px solid var(--border)", borderRadius: 6, padding: 12, width: "100%" };

export function RequestIntakeForm({ errorCode }: { errorCode?: string }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function sendCode() {
    setBusy(true);
    const result = await sendPublicRequestOtp(email);
    setFeedback(result.message);
    if (result.ok) setCodeSent(true);
    setBusy(false);
  }

  async function verifyCode() {
    setBusy(true);
    const result = await verifyPublicRequestOtp(email, otp);
    setFeedback(result.message);
    if (result.ok) setVerified(true);
    setBusy(false);
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {errorCode ? <Card role="alert">We couldn’t submit that request. Review the required fields and try again. If it keeps happening, contact FAST.</Card> : null}
      <Card style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>1. Verify your email</h2>
        <p style={{ margin: 0 }}>We’ll send a one-time code. No customer portal profile or password is required.</p>
        <label>Email address<input autoComplete="email" type="email" required maxLength={320} value={email} onChange={(event) => { setEmail(event.target.value); setCodeSent(false); setVerified(false); }} style={fieldStyle} /></label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
          <Button type="button" onClick={sendCode} disabled={busy || verified}>{busy ? "Please wait…" : codeSent ? "Send another code" : "Email me a code"}</Button>
          {codeSent && !verified ? <label>Six-digit code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} style={fieldStyle} /></label> : null}
          {codeSent && !verified ? <Button type="button" variant="secondary" onClick={verifyCode} disabled={busy || otp.length !== 6}>{busy ? "Checking…" : "Verify email"}</Button> : null}
        </div>
        {feedback ? <p role="status" aria-live="polite" style={{ margin: 0 }}>{feedback}</p> : null}
        {verified ? <p role="status" style={{ margin: 0 }}>Verified as {email.toLowerCase()}.</p> : null}
      </Card>

      <Card style={{ display: "grid", gap: "0.75rem", opacity: verified ? 1 : 0.7 }}>
        <h2 style={{ margin: 0 }}>2. Tell us about the request</h2>
        {!verified ? <p style={{ margin: 0 }}>Verify your email to unlock the request form.</p> : null}
        <form action={createPublicServiceRequest} style={{ display: "grid", gap: "1rem" }}>
          <fieldset disabled={!verified} style={{ display: "grid", gap: "1rem", border: 0, padding: 0, margin: 0 }}>
            <label aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
            <label>Your name<input name="requester_name" autoComplete="name" required minLength={2} maxLength={160} style={fieldStyle} /></label>
            <label>Company or organization, if applicable<input name="requester_company" autoComplete="organization" maxLength={200} style={fieldStyle} /></label>
            <label>Phone number, if you’d like us to call<input name="requester_phone" autoComplete="tel" maxLength={40} style={fieldStyle} /></label>
            <label>Property or site address<input name="site_description" required maxLength={500} style={fieldStyle} placeholder="Building name, street, city" /></label>
            <label>Request type<select name="category" required defaultValue="REACTIVE_ISSUE" style={fieldStyle}>{Object.entries(serviceRequestCategoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Urgency<select name="urgency" required defaultValue="ROUTINE" style={fieldStyle}>{Object.entries(serviceRequestUrgencyLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>This is not an emergency response channel.</small></label>
            <label>Short title<input name="title" required minLength={3} maxLength={160} style={fieldStyle} placeholder="For example, fire alarm panel showing a fault" /></label>
            <label>What do you need?<textarea name="details" required minLength={10} maxLength={5000} rows={5} style={fieldStyle} /></label>
            <label>Equipment or asset reference, if known<input name="affected_asset" maxLength={160} style={fieldStyle} /></label>
            <label>Preferred access window<input name="preferred_access_window" maxLength={300} style={fieldStyle} placeholder="Days and times that usually work" /></label>
            <label>On-site contact, if different<input name="onsite_contact" maxLength={160} style={fieldStyle} /></label>
            <label>Contract, project, or PO reference<input name="reference_note" maxLength={160} style={fieldStyle} /></label>
            <Button type="submit">Submit request</Button>
          </fieldset>
        </form>
      </Card>
    </div>
  );
}
