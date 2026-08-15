"use client";

import { useEffect, useState } from "react";
import { KeyRound, Webhook, Plus, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tabs, TabsContent, TabsList, TabsTrigger } from "@capitech/ui";
import { toast } from "@capitech/ui";
import { formatRelativeTime, humanize } from "@capitech/lib";
import { cn } from "@capitech/ui";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  status: string;
  last_used_at: string | null;
  owner_type: string | null;
  owner_id: string | null;
  created_at: string;
}
interface EndpointRow {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
}
interface DeliveryRow {
  id: string;
  event_type: string;
  status: string;
  created_at: string;
  endpoint_id: string;
}

export default function OpenApiPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [endpoints, setEndpoints] = useState<EndpointRow[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);

  // create key dialog
  const [keyOpen, setKeyOpen] = useState(false);
  const [ownerType, setOwnerType] = useState("customer");
  const [ownerId, setOwnerId] = useState("");
  const [keyName, setKeyName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["read"]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    const res = await fetch("/admin/api/openapi/list").then((r) => r.json());
    setKeys(res.keys ?? []);
    setEndpoints(res.endpoints ?? []);
    setDeliveries(res.deliveries ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createKey() {
    setCreating(true);
    const res = await fetch("/admin/api/openapi/keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ owner_type: ownerType, owner_id: ownerId, name: keyName, scopes }),
    });
    const body = await res.json();
    if (!res.ok) {
      toast.error(body.error ?? "Failed to create key");
      setCreating(false);
      return;
    }
    setNewKey(body.raw_key);
    toast.success("API key created — copy it now, it won't be shown again");
    setCreating(false);
    load();
  }

  async function revokeKey(id: string) {
    const res = await fetch("/admin/api/openapi/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyId: id }),
    });
    if (res.ok) {
      toast.success("Key revoked");
      load();
    } else {
      toast.error("Failed to revoke key");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-950">Open API</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Issue scoped API keys for business clients and manage webhook endpoints.
        </p>
      </div>

      <Tabs defaultValue="keys">
        <TabsList>
          <TabsTrigger value="keys"><KeyRound className="size-4" /> API keys</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="size-4" /> Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="keys" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={keyOpen} onOpenChange={(v) => { setKeyOpen(v); if (!v) setNewKey(null); }}>
              <DialogTrigger asChild>
                <Button><Plus className="size-4" /> Create API key</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{newKey ? "Key created" : "Create an API key"}</DialogTitle>
                  <DialogDescription>
                    {newKey
                      ? "Copy this key now — for security it will never be shown again."
                      : "Bind the key to a customer or organization and choose its scopes."}
                </DialogDescription>
                </DialogHeader>
                {newKey ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-lg bg-navy-950 p-3">
                      <code className="flex-1 break-all font-mono text-xs text-emerald-400">{newKey}</code>
                      <Button size="sm" variant="ghost" className="text-navy-100" onClick={() => { navigator.clipboard?.writeText(newKey); toast.success("Copied"); }}>
                        <Copy className="size-4" />
                      </Button>
                    </div>
                    <Button className="w-full" onClick={() => { setNewKey(null); setKeyOpen(false); }}>Done</Button>
                  </div>
                ) : (
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Owner type</Label>
                      <Select value={ownerType} onValueChange={setOwnerType}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="organization">Organization</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Owner ID (customer or organization uuid)</Label>
                      <Input value={ownerId} onChange={(e) => setOwnerId(e.target.value)} placeholder="uuid" />
                    </div>
                    <div className="space-y-2">
                      <Label>Key name</Label>
                      <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Acme Production" />
                    </div>
                    <div className="space-y-2">
                      <Label>Scopes</Label>
                      <div className="flex flex-wrap gap-2">
                        {["read", "write:transfers", "webhooks", "admin"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))}
                            className={cn(
                              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                              scopes.includes(s) ? "border-brand-500 bg-brand-50 text-brand-700" : "border-border text-muted-foreground"
                            )}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {!newKey && (
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setKeyOpen(false)}>Cancel</Button>
                    <Button onClick={createKey} disabled={creating || !ownerId || !keyName}>
                      {creating ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Create
                    </Button>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Key</th>
                      <th className="px-4 py-3 font-medium">Scopes</th>
                      <th className="px-4 py-3 font-medium">Owner</th>
                      <th className="px-4 py-3 font-medium">Last used</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {keys.map((k) => (
                      <tr key={k.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-navy-950">{k.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.key_prefix}…</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {k.scopes.map((s) => <Badge key={s} variant="info" className="font-mono">{s}</Badge>)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {k.owner_type} · {k.owner_id?.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{k.last_used_at ? formatRelativeTime(k.last_used_at) : "never"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={k.status === "active" ? "success" : "destructive"}>{k.status}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {k.status === "active" && (
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => revokeKey(k.id)}>
                              Revoke
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {keys.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No API keys yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-medium">URL</th>
                    <th className="px-4 py-3 font-medium">Events</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {endpoints.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs text-navy-950">{e.url}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {e.events.map((ev) => <Badge key={ev} variant="neutral" className="font-mono">{ev}</Badge>)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={e.active ? "success" : "neutral"}>{e.active ? "active" : "paused"}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatRelativeTime(e.created_at)}</td>
                    </tr>
                  ))}
                  {endpoints.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">No webhook endpoints. Register one via the Open API.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-brand-600" /> Recent deliveries
              </CardTitle>
              <CardDescription>Last 50 webhook deliveries for this tenant.</CardDescription>
            </CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deliveries yet.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {deliveries.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-4 py-2.5">
                      <div>
                        <p className="font-mono text-xs text-navy-950">{d.event_type}</p>
                        <p className="text-xs text-muted-foreground">endpoint {d.endpoint_id?.slice(0, 8)} · {formatRelativeTime(d.created_at)}</p>
                      </div>
                      <Badge variant={d.status === "delivered" ? "success" : "destructive"}>{humanize(d.status)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
