"use client";

import { createPublicServiceRequest } from "@/app/(public)/request/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { serviceRequestCategoryLabels, serviceRequestUrgencyLabels } from "@/lib/service-requests/constants";

const fieldStyle = { minHeight: 44, border: "1px solid var(--border)", borderRadius: 6, padding: 12, width: "100%" };

export function RequestIntakeForm({ errorCode }: { errorCode?: string }) {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {errorCode ? <Card role="alert">We couldn’t submit that request. Review the required fields and try again. If it keeps happening, contact FAST.</Card> : null}
      <Card style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={{ margin: 0 }}>Tell us about the request</h2>
        <p style={{ margin: 0 }}>No registration is required. After submission, FAST will give you a secure tracking reference, similar to parcel delivery tracking.</p>
        <form action={createPublicServiceRequest} style={{ display: "grid", gap: "1rem" }}>
          <label>Contact email<input name="requester_email" autoComplete="email" type="email" required maxLength={320} style={fieldStyle} /><small>FAST may use this to contact you about the request. No verification code is required.</small></label>
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
          <label aria-hidden="true" style={{ position: "absolute", left: "-10000px" }}>Leave this field empty<input name="website" tabIndex={-1} autoComplete="off" /></label>
          <Button type="submit">Submit request</Button>
        </form>
      </Card>
    </div>
  );
}
