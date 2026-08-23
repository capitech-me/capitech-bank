"use client";

import { useState } from "react";
import { ExternalLink, FileText, FolderOpen, Loader2 } from "lucide-react";
import { Badge, Button } from "@capitech/ui";
import { humanize } from "@capitech/lib";
import { getBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import type { KycDocumentRow } from "@/lib/data";

const KYC_STORAGE_BASE = "https://hekufxbeigxzkyfsqalx.supabase.co/storage/v1/object/public/kyc-documents/";

const DOC_STATUS_STYLES: Record<string, string> = {
  verified: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  rejected: "border-rose-500/30 bg-rose-500/15 text-rose-300",
  pending: "border-amber-500/30 bg-amber-500/15 text-amber-300",
};

export function KycDocumentsButton({
  documents,
}: {
  documents: KycDocumentRow[];
}) {
  const [open, setOpen] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [resolving, setResolving] = useState(false);

  function publicUrl(doc: KycDocumentRow) {
    return `${KYC_STORAGE_BASE}${doc.filePath}`;
  }

  async function resolveUrls() {
    if (!isSupabaseConfigured()) return;
    setResolving(true);
    try {
      const supabase = getBrowserClient();
      const resolved: Record<string, string> = {};
      await Promise.all(
        documents.map(async (doc) => {
          const { data } = await supabase.storage.from("kyc-documents").createSignedUrl(doc.filePath, 3600);
          resolved[doc.id] = data?.signedUrl ?? publicUrl(doc);
        })
      );
      setUrls(resolved);
    } finally {
      setResolving(false);
    }
  }

  function toggle() {
    setOpen((v) => !v);
    if (!open && Object.keys(urls).length === 0) void resolveUrls();
  }

  return (
    <div>
      <Button size="sm" variant="outline" onClick={toggle}>
        <FileText className="size-4" /> Documents ({documents.length})
      </Button>
      {open && (
        <div className="mt-2 rounded-lg border border-border bg-navy-950/60 p-3">
          {documents.length === 0 ? (
            <p className="text-xs text-muted-foreground">No documents uploaded.</p>
          ) : (
            <>
              {resolving && (
                <p className="mb-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" /> Resolving document links…
                </p>
              )}
              <ul className="space-y-2">
                {documents.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex min-w-0 flex-col">
                      <Badge variant="outline" className={DOC_STATUS_STYLES[doc.status] ?? "border-white/10 bg-white/5 text-navy-200"}>
                        {humanize(doc.documentType)}
                      </Badge>
                      <span className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                        {doc.filePath}
                      </span>
                    </div>
                    <a
                      href={urls[doc.id] ?? publicUrl(doc)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium text-brand-300 transition-colors hover:bg-white/5 hover:text-brand-200"
                    >
                      View <ExternalLink className="size-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {!open && documents.length === 0 && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
          <FolderOpen className="size-3" /> No documents
        </p>
      )}
    </div>
  );
}
