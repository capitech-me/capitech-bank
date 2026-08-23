"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Mail, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@capitech/ui";
import { toast } from "@capitech/ui";
import { cn } from "@capitech/ui";
import { formatMoney } from "@capitech/lib";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";

const ROLES = ["Director", "Officer", "Admin", "Member"] as const;

interface TeamOrg {
  id: string;
  legal_name: string;
}

interface TeamMember {
  id: string;
  organization_id: string;
  profile_id: string | null;
  role_title: string;
  is_signatory: boolean;
  approval_threshold: string | number | null;
  status: "active" | "inactive";
  profiles?: { first_name: string | null; last_name: string | null } | null;
}

/* Demo-mode sample data (no Supabase configured) */
const DEMO_ORGS: TeamOrg[] = [{ id: "org-1", legal_name: "Capitech Holdings Ltd" }];
const DEMO_USERS: Record<string, string> = {
  "jane.doe@capitech.me": "Jane Doe",
  "marcus.reid@capitech.me": "Marcus Reid",
  "sara.ali@capitech.me": "Sara Ali",
};
const DEMO_MEMBERS: TeamMember[] = [
  { id: "m-1", organization_id: "org-1", profile_id: "me", role_title: "Director", is_signatory: true, approval_threshold: 50000, status: "active", profiles: { first_name: "Jane", last_name: "Doe" } },
  { id: "m-2", organization_id: "org-1", profile_id: "u-2", role_title: "Officer", is_signatory: true, approval_threshold: 10000, status: "active", profiles: { first_name: "Marcus", last_name: "Reid" } },
  { id: "m-3", organization_id: "org-1", profile_id: "u-3", role_title: "Admin", is_signatory: false, approval_threshold: null, status: "inactive", profiles: { first_name: "Sara", last_name: "Ali" } },
];

function memberName(m: TeamMember): string {
  const p = m.profiles;
  if (p && (p.first_name || p.last_name)) return [p.first_name, p.last_name].filter(Boolean).join(" ");
  return "Team member";
}

function memberInitials(m: TeamMember): string {
  const n = memberName(m);
  const parts = n.split(" ").filter(Boolean);
  const init = (parts[0]?.[0] ?? "?").toUpperCase();
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "").toUpperCase() : "";
  return init + last;
}

/* ---------------------------------------------------------------- Invite */

function InviteMemberDialog({ organizationId, disabled, onInvited }: { organizationId: string; disabled?: boolean; onInvited: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [roleTitle, setRoleTitle] = useState<string>("Director");
  const [isSignatory, setIsSignatory] = useState(false);
  const [approvalThreshold, setApprovalThreshold] = useState("");
  const [status, setStatus] = useState<string>("active");

  async function handleInvite() {
    if (!email.trim()) return toast.error("Enter the member's email address");
    setLoading(true);

    if (!isSupabaseConfigured()) {
      // Demo mode — simulate the invite flow.
      await new Promise((r) => setTimeout(r, 700));
      const key = email.trim().toLowerCase();
      if (!DEMO_USERS[key]) {
        toast.error("No account found for that email — the person must create a Capitech account first.");
        setLoading(false);
        return;
      }
      if (DEMO_MEMBERS.some((m) => m.profile_id !== "me" && m.profile_id === key)) {
        toast.error("This person is already a team member.");
        setLoading(false);
        return;
      }
      toast.success("Member invited (demo mode)");
      setOpen(false);
      setLoading(false);
      onInvited();
      return;
    }

    try {
      const res = await fetch("/app/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          organization_id: organizationId,
          role_title: roleTitle,
          is_signatory: isSignatory,
          approval_threshold: approvalThreshold === "" ? null : Number(approvalThreshold),
          status,
        }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!data.ok) {
        toast.error(data.message ?? "Could not invite member.");
        setLoading(false);
        return;
      }
      toast.success("Member invited");
      setOpen(false);
      setEmail("");
      setApprovalThreshold("");
      onInvited();
    } catch {
      toast.error("Could not reach the server. Please try again.");
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <UserPlus className="size-4" /> Invite member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a team member</DialogTitle>
          <DialogDescription>
            Add a director, officer, admin or member to your corporate team. The person must already have a Capitech account.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={roleTitle} onValueChange={setRoleTitle}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-threshold">Approval threshold (USD, optional)</Label>
            <Input id="invite-threshold" inputMode="decimal" value={approvalThreshold} onChange={(e) => setApprovalThreshold(e.target.value)} placeholder="e.g. 10000" />
            <p className="text-xs text-muted-foreground">Maximum amount this member can approve alone. Leave blank for no limit.</p>
          </div>
          <label className="flex items-center gap-3 text-sm text-navy-100">
            <input
              type="checkbox"
              checked={isSignatory}
              onChange={(e) => setIsSignatory(e.target.checked)}
              className="size-4 rounded border-border accent-brand-600"
            />
            Signatory — authorized to sign on behalf of the company
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleInvite} disabled={loading || !email.trim()}>{loading ? "Inviting…" : "Send invite"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- Page */

export default function TeamPage() {
  const [orgs, setOrgs] = useState<TeamOrg[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMembers = useCallback(async (orgId: string) => {
    if (!isSupabaseConfigured()) {
      setMembers(DEMO_MEMBERS);
      return;
    }
    const supabase = getBrowserClient();
    const { data, error } = await supabase
      .from("organization_members")
      .select("id, organization_id, profile_id, role_title, is_signatory, approval_threshold, status, profiles(first_name, last_name)")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) {
      // RLS/join edge case — fall back to the raw member rows (no profile names).
      const { data: plain } = await supabase
        .from("organization_members")
        .select("id, organization_id, profile_id, role_title, is_signatory, approval_threshold, status")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      setMembers((plain as unknown as TeamMember[] | null) ?? []);
      return;
    }
    // PostgREST types the to-one join as an array — normalize to a single object.
    const normalized = (data ?? []).map((row: Record<string, unknown>) => {
      const rel = row.profiles;
      return { ...row, profiles: Array.isArray(rel) ? (rel[0] ?? null) : rel };
    });
    setMembers(normalized as unknown as TeamMember[]);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isSupabaseConfigured()) {
        setOrgs(DEMO_ORGS);
        setCurrentOrgId(DEMO_ORGS[0].id);
        setCurrentUserId("me");
        setMembers(DEMO_MEMBERS);
        setLoading(false);
        return;
      }
      const supabase = getBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setCurrentUserId(user?.id ?? null);

      const { data: orgsData } = await supabase.from("organizations").select("id, legal_name");
      if (cancelled) return;
      const orgList = (orgsData as TeamOrg[] | null) ?? [];
      setOrgs(orgList);
      const first = orgList[0];
      if (first) {
        setCurrentOrgId(first.id);
        await loadMembers(first.id);
      } else {
        setMembers([]);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [loadMembers]);

  const currentOrg = orgs.find((o) => o.id === currentOrgId);

  async function toggleStatus(member: TeamMember) {
    const next: "active" | "inactive" = member.status === "active" ? "inactive" : "active";
    if (!isSupabaseConfigured()) {
      await new Promise((r) => setTimeout(r, 400));
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, status: next } : m)));
      toast.success(`${memberName(member)} is now ${next}`);
      return;
    }
    const supabase = getBrowserClient();
    const { error } = await supabase
      .from("organization_members")
      .update({ status: next })
      .eq("id", member.id);
    if (error) return toast.error(error.message);
    toast.success(`${memberName(member)} is now ${next}`);
    await loadMembers(member.organization_id);
  }

  async function removeMember(member: TeamMember) {
    if (member.profile_id && currentUserId && member.profile_id === currentUserId) return;
    if (!isSupabaseConfigured()) {
      await new Promise((r) => setTimeout(r, 400));
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success(`${memberName(member)} removed`);
      return;
    }
    const supabase = getBrowserClient();
    const { error } = await supabase.from("organization_members").delete().eq("id", member.id);
    if (error) return toast.error(error.message);
    toast.success(`${memberName(member)} removed from the team`);
    await loadMembers(member.organization_id);
  }

  const isSelf = (member: TeamMember) => member.profile_id !== null && member.profile_id === currentUserId;

  if (loading) {
    return <div className="mx-auto max-w-5xl py-10 text-center text-sm text-muted-foreground">Loading team…</div>;
  }

  /* No linked business — empty state */
  if (orgs.length === 0) {
    return (
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage the people authorised on your business accounts.</p>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
          <Building2 className="size-8 text-muted-foreground" />
          <h3 className="mt-3 font-semibold text-white">Link your business to manage team members</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Complete corporate onboarding to add directors, officers and signatories to your company team.
          </p>
          <Button asChild className="mt-5">
            <Link href="/onboarding" prefetch={false}>Complete corporate onboarding</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Team</h1>
          <p className="mt-1 text-sm text-muted-foreground">Directors, signatories and approvers for your organization.</p>
        </div>
        <InviteMemberDialog organizationId={currentOrgId} disabled={!currentOrgId} onInvited={() => loadMembers(currentOrgId)} />
      </div>

      {/* Organization selector */}
      {orgs.length > 1 && (
        <Card>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="size-4 text-brand-400" /> Organization
            </div>
            <Select value={currentOrgId} onValueChange={(v) => { setCurrentOrgId(v); loadMembers(v); }}>
              <SelectTrigger className="w-full max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {orgs.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.legal_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {!isSupabaseConfigured() && (
        <Alert variant="info">
          <AlertDescription>Demo mode — showing sample team data. Connect Supabase to manage real members.</AlertDescription>
        </Alert>
      )}

      {members.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <Users className="mx-auto size-10 text-muted-foreground" />
            <h3 className="mt-4 font-semibold text-white">No team members yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Invite your first director or signatory to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-brand-400" /> {currentOrg?.legal_name ?? "Organization"}
            </CardTitle>
            <CardDescription>{members.length} member{members.length !== 1 ? "s" : ""}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden grid-cols-[1.6fr_1fr_auto_auto_auto] gap-3 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
              <span>Member</span>
              <span>Role</span>
              <span>Approval limit</span>
              <span className="w-24 text-center">Status</span>
              <span className="w-28 text-right">Actions</span>
            </div>
            <ul className="divide-y divide-border">
              {members.map((m) => {
                const self = isSelf(m);
                return (
                  <li key={m.id} className={cn("grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[1.6fr_1fr_auto_auto_auto] md:items-center md:gap-3", m.status === "inactive" && "opacity-60")}>
                    {/* Member */}
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-600/20 text-sm font-semibold text-brand-200">
                        {memberInitials(m)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium text-white">{memberName(m)}</p>
                          {self && <Badge variant="info">You</Badge>}
                          {m.is_signatory && (
                            <Badge variant="success" className="hidden sm:inline-flex">
                              <ShieldCheck className="size-3" /> Signatory
                            </Badge>
                          )}
                        </div>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Mail className="size-3" />
                          {m.profiles && !self ? "Registered user" : self ? "You" : "—"}
                        </p>
                      </div>
                    </div>
                    {/* Role */}
                    <div className="md:pt-0">
                      <span className="text-xs text-muted-foreground md:hidden">Role · </span>
                      <span className="text-sm font-medium text-navy-100">{m.role_title}</span>
                    </div>
                    {/* Approval threshold */}
                    <div className="md:pt-0">
                      <span className="text-xs text-muted-foreground md:hidden">Approval limit · </span>
                      <span className="text-sm text-navy-100">
                        {m.approval_threshold === null || m.approval_threshold === "" ? "—" : formatMoney(String(m.approval_threshold), "USD")}
                      </span>
                    </div>
                    {/* Status */}
                    <div className="flex items-center gap-2 md:justify-center md:pt-0">
                      <Badge variant={m.status === "active" ? "success" : "neutral"}>{m.status}</Badge>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 md:justify-end md:pt-0">
                      <Button
                        variant={m.status === "active" ? "outline" : "secondary"}
                        size="sm"
                        onClick={() => toggleStatus(m)}
                      >
                        {m.status === "active" ? "Deactivate" : "Activate"}
                      </Button>
                      {!self && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeMember(m)}
                        >
                          <Trash2 className="size-4" /> <span className="sr-only sm:not-sr-only">Remove</span>
                        </Button>
                      )}
                    </div>
                    {m.is_signatory && <p className="text-xs text-muted-foreground sm:hidden">Signatory</p>}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
