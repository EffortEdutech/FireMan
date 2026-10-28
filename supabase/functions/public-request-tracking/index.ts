// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://fire-man.vercel.app",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const serviceRequestCategories = new Set(["REACTIVE_ISSUE", "PLANNED_SERVICE", "INSPECTION", "FINDING_FOLLOW_UP", "QUOTATION", "OTHER"]);
const serviceRequestUrgencies = new Set(["ROUTINE", "PRIORITY", "URGENT"]);

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function clean(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const result = value.trim();
  return result && result.length <= max ? result : null;
}

function normalizeToken(value: unknown) {
  if (typeof value !== "string") return null;
  const token = value.toLowerCase().replace(/[^a-f0-9]/g, "");
  return /^[a-f0-9]{24}$/.test(token) ? token : null;
}

function makeToken() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function publicRequest(request: Record<string, unknown>) {
  return {
    request_reference: request.request_reference, created_at: request.created_at,
    updated_at: request.updated_at, site_description: request.site_description,
    category: request.category, urgency: request.urgency, title: request.title,
    details: request.details, affected_asset: request.affected_asset,
    status: request.status, customer_message: request.customer_message,
    next_action: request.next_action,
    appointment_at: request.appointment_at,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const body = await req.json() as Record<string, unknown>;
    const action = body.action;
    const token = normalizeToken(body.trackingToken);

    if (action === "get") {
      if (!token) return response({ error: "Request not found" }, 404);
      const { data: request, error } = await admin.from("service_requests").select("id,request_reference,created_at,updated_at,site_description,category,urgency,title,details,affected_asset,status,customer_message,next_action,appointment_at").eq("public_tracking_token", token).maybeSingle();
      if (error || !request) return response({ error: "Request not found" }, 404);
      const [{ data: events }, { data: replies }] = await Promise.all([
        admin.from("service_request_events").select("id,event_type,to_status,message,appointment_at,created_at").eq("service_request_id", request.id).eq("public_visible", true).order("created_at", { ascending: true }),
        admin.from("service_request_replies").select("id,sender_type,message,created_at").eq("service_request_id", request.id).eq("public_visible", true).order("created_at", { ascending: true }),
      ]);
      return response({ request: publicRequest(request), events: events ?? [], replies: replies ?? [] });
    }

    if (action === "create") {
      const email = clean(body.requesterEmail, 320)?.toLowerCase() ?? null;
      const name = clean(body.requesterName, 160);
      const site = clean(body.siteDescription, 500);
      const category = clean(body.category, 40);
      const urgency = clean(body.urgency, 20);
      const title = clean(body.title, 160);
      const details = clean(body.details, 5000);
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length < 2 || !site || !title || title.length < 3 || !details || details.length < 10 || !category || !serviceRequestCategories.has(category) || !urgency || !serviceRequestUrgencies.has(urgency)) return response({ error: "Required request details are invalid" }, 400);
      const { data: organisation } = await admin.from("organisations").select("id").eq("active", true).eq("public_request_enabled", true).limit(1).maybeSingle();
      if (!organisation) return response({ error: "FAST request intake is not available" }, 409);
      const { count } = await admin.from("service_requests").select("id", { count: "exact", head: true }).eq("requester_email", email).gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
      if ((count ?? 0) >= 5) return response({ error: "Request submission limit reached; try again later" }, 429);
      const { data: request, error } = await admin.from("service_requests").insert({
        organisation_id: organisation.id, public_tracking_token: makeToken(), requester_email: email,
        requester_name: name, requester_company: clean(body.requesterCompany, 200), requester_phone: clean(body.requesterPhone, 40),
        site_description: site, category, urgency, title, details, affected_asset: clean(body.affectedAsset, 160),
        preferred_access_window: clean(body.preferredAccessWindow, 300), onsite_contact: clean(body.onsiteContact, 160), reference_note: clean(body.referenceNote, 160),
      }).select("request_reference,public_tracking_token").single();
      if (error || !request) return response({ error: "Request could not be created" }, 500);
      return response({ requestReference: request.request_reference, trackingToken: request.public_tracking_token });
    }

    if (action === "reply") {
      if (!token) return response({ error: "Request not found" }, 404);
      const message = clean(body.message, 2000);
      if (!message) return response({ error: "A message is required" }, 400);
      const { data: request } = await admin.from("service_requests").select("id,organisation_id").eq("public_tracking_token", token).maybeSingle();
      if (!request) return response({ error: "Request not found" }, 404);
      const { count } = await admin.from("service_request_replies").select("id", { count: "exact", head: true }).eq("service_request_id", request.id).gt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
      if ((count ?? 0) >= 20) return response({ error: "Reply limit reached; try again later" }, 429);
      const { error } = await admin.from("service_request_replies").insert({ organisation_id: request.organisation_id, service_request_id: request.id, sender_user_id: null, sender_type: "CUSTOMER", message, public_visible: true });
      if (error) return response({ error: "Reply could not be sent" }, 500);
      return response({ ok: true });
    }

    return response({ error: "Unknown action" }, 400);
  } catch {
    return response({ error: "Invalid request" }, 400);
  }
});

