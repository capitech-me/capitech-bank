import { NextResponse } from "next/server";
import { createAdminClient, createServerClient, withRateLimit } from "@capitech/db";
import { cookies } from "next/headers";
import { sendEmail, teamInviteEmail } from "@capitech/email";

/**
 * POST /app/api/team/invite
 * Adds an existing user (by email) as a member of one of YOUR organizations.
 *
 * The email -> profile_id resolution cannot be done client-side: the
 * `profiles` table carries no email column (email lives in auth.users) and
 * RLS restricts profiles reads. So this route:
 *   1. verifies the caller owns the target organization (RLS),
 *   2. resolves the user id by email via the admin (service role) client,
 *   3. inserts the organization_members row scoped to the caller's tenant,
 *   4. sends a best-effort invite email to the new member.
 */

const ALLOWED_ROLES = ["Director", "Officer", "Admin", "Member"] as const;

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

export async function POST(req: Request) {
  const limited = withRateLimit(req, RATE_LIMIT, RATE_WINDOW_MS);
  if (limited) return limited;

  const cookieStore = await cookies();
  const supabase = await createServerClient({
    getAll: () => cookieStore.getAll(),
    setAll: (cookiesToSet) => {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      } catch {
        // ignore
      }
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const organizationId = typeof body.organization_id === "string" ? body.organization_id : "";
  const roleTitle = typeof body.role_title === "string" ? body.role_title : "Director";
  const isSignatory = Boolean(body.is_signatory);
  const rawThreshold = body.approval_threshold;
  const approvalThreshold =
    rawThreshold === null || rawThreshold === undefined || rawThreshold === ""
      ? null
      : Number(rawThreshold);
  const status = body.status === "inactive" ? "inactive" : "active";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, code: "invalid_email", message: "Enter a valid email address." });
  }
  if (!organizationId) {
    return NextResponse.json({ ok: false, code: "missing_org", message: "No organization selected." });
  }
  if (!ALLOWED_ROLES.includes(roleTitle as (typeof ALLOWED_ROLES)[number])) {
    return NextResponse.json({ ok: false, code: "invalid_role", message: "Invalid role." });
  }
  if (approvalThreshold !== null && (Number.isNaN(approvalThreshold) || approvalThreshold < 0)) {
    return NextResponse.json({ ok: false, code: "invalid_threshold", message: "Approval threshold must be a positive number." });
  }

  // 1. Confirm the caller owns the organization (RLS: orgs_select_owner).
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .select("id, legal_name")
    .eq("id", organizationId)
    .maybeSingle();
  if (orgError) {
    return NextResponse.json({ ok: false, code: "org_error", message: orgError.message });
  }
  if (!org) {
    return NextResponse.json({ ok: false, code: "org_not_found", message: "You do not have permission to manage this organization." });
  }

  // Caller's tenant + display name (for the invite email).
  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("tenant_id, first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();
  const tenantId = callerProfile?.tenant_id ?? null;
  if (!tenantId) {
    return NextResponse.json({ ok: false, code: "no_tenant", message: "No tenant found for your account." });
  }
  const inviterName = [callerProfile?.first_name, callerProfile?.last_name].filter(Boolean).join(" ");

  // 2. Resolve the invitee's user id by email (service role — auth.users).
  const admin = createAdminClient();
  let targetUser: { id: string; email: string } | null = null;
  try {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw error;
    const allUsers = data.users ?? [];
    // GoTrue supports pagination for large user sets — walk pages until the end.
    let page = 2;
    let last = data.lastPage ?? 1;
    while (page <= last) {
      const next = await admin.auth.admin.listUsers({ page, perPage: 200 });
      if (next.error) break;
      allUsers.push(...(next.data?.users ?? []));
      last = next.data?.lastPage ?? last;
      page += 1;
    }
    const found = allUsers.find((u) => u.email && u.email.toLowerCase() === email);
    if (found && found.id) targetUser = { id: found.id, email: found.email ?? email };
  } catch {
    targetUser = null;
  }

  if (!targetUser) {
    return NextResponse.json({
      ok: false,
      code: "no_account",
      message: "No account found for that email — the person must create a Capitech account first.",
    });
  }

  // 3. Prevent duplicates.
  const { data: existing } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", org.id)
    .eq("profile_id", targetUser.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: false, code: "already_member", message: "This person is already a team member." });
  }

  // 4. Insert the membership (RLS: org_members_insert_owner).
  const { data: member, error: insertError } = await supabase
    .from("organization_members")
    .insert({
      tenant_id: tenantId,
      organization_id: org.id,
      profile_id: targetUser.id,
      role_title: roleTitle,
      is_signatory: isSignatory,
      approval_threshold: approvalThreshold,
      status,
    })
    .select()
    .single();
  if (insertError) {
    return NextResponse.json({ ok: false, code: "insert_failed", message: insertError.message });
  }

  // 5. Best-effort invite email to the new member (never blocks the action).
  void sendEmail({
    to: targetUser.email,
    subject: `You've been added to ${org.legal_name}`,
    html: teamInviteEmail({
      firstName: targetUser.email.split("@")[0] || "there",
      orgName: org.legal_name,
      roleTitle,
      inviterName: inviterName || undefined,
    }),
  });

  return NextResponse.json({ ok: true, member });
}
