import { Inbox } from "lucide-react";
import { Badge } from "@capitech/ui";
import { formatDateTime } from "@capitech/lib";
import { getContactMessages } from "@/lib/data";
import { ContactStatusButtons } from "@/components/contact-status-buttons";

function statusVariant(status: string): "warning" | "info" | "neutral" {
  if (status === "new") return "warning";
  if (status === "responded") return "info";
  return "neutral";
}

export default async function ContactPage() {
  const messages = await getContactMessages();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Contact messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Messages submitted from the public contact form. Newest first.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-white/5 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Subject</th>
                <th className="px-4 py-3 font-medium">Message</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {messages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <Inbox className="mx-auto size-10 text-muted-foreground" />
                    <h3 className="mt-4 font-semibold text-white">No contact messages yet</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Messages submitted from the public contact form will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                messages.map((m) => (
                  <tr key={m.id} className="align-top hover:bg-white/5">
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDateTime(m.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-navy-100">{m.name}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{m.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.subject || "—"}</td>
                    <td className="max-w-md px-4 py-3">
                      <p className="line-clamp-3 text-muted-foreground">{m.message}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(m.status)}>
                        {m.status === "new" ? "New" : m.status === "responded" ? "Responded" : "Closed"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <ContactStatusButtons id={m.id} status={m.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
