"use client";

import Link from "next/link";
import { useState } from "react";

type EmailRow = {
  id: string;
  status: string | null;
  from: string;
  fromName: string;
  subject: string;
  preview: string;
  date: string | null;
  emailType: string;
  hasAttachments: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function InboxList({
  emails,
  trash,
}: {
  emails: EmailRow[];
  trash: boolean;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const allSelected = emails.length > 0 && selected.length === emails.length;

  function toggle(id: string) {
    setSelected((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  function toggleAll() {
    setSelected(allSelected ? [] : emails.map((email) => email.id));
  }

  async function action(actionName: "trash" | "restore" | "permanent") {
    if (selected.length === 0) return;
    if (actionName === "permanent" && !window.confirm("Permanently delete the selected emails? This cannot be undone.")) return;

    setBusy(true);
    const body = new URLSearchParams();
    body.set("action", actionName);
    body.set("ids", JSON.stringify(selected));

    const response = await fetch("/api/admin/inbox/delete", {
      method: "POST",
      body,
    });

    if (response.redirected) {
      window.location.href = response.url;
      return;
    }

    const result = await response.json().catch(() => null) as { error?: string } | null;
    window.alert(result?.error || "The inbox action failed.");
    setBusy(false);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-black/10 bg-[#F7F4EF] px-5 py-3">
        <label className="flex items-center gap-2 text-xs font-bold text-black/60">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            disabled={busy || emails.length === 0}
            className="h-4 w-4 rounded border-black/20"
          />
          Select all
        </label>
        <span className="text-xs text-black/35">{selected.length} selected</span>
        {selected.length > 0 && (
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => action(trash ? "restore" : "trash")}
              disabled={busy}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold disabled:opacity-50"
            >
              {trash ? "Restore" : "Move to trash"}
            </button>
            <button
              type="button"
              onClick={() => action("permanent")}
              disabled={busy}
              className="rounded-xl bg-[#111111] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              Delete permanently
            </button>
          </div>
        )}
      </div>

      <div className="divide-y divide-black/5">
        {emails.map((email) => {
          const isUnread = email.status === "new";
          return (
            <div
              key={email.id}
              className={`group border-l-4 px-5 py-4 transition ${isUnread ? "border-[#EBC6C2] bg-[#FFFDFC]" : "border-transparent hover:bg-[#E8DDD0]/35"}`}
            >
              <div className="flex gap-3">
                <div className="pt-2">
                  <input
                    type="checkbox"
                    aria-label={`Select ${email.subject}`}
                    checked={selected.includes(email.id)}
                    onChange={() => toggle(email.id)}
                    className="h-4 w-4 rounded border-black/20"
                  />
                </div>
                <Link href={`/admin/inbox/${email.id}`} className="min-w-0 flex-1">
                  <div className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EBC6C2] text-sm font-black uppercase">
                      {(email.fromName || email.from || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-center gap-2">
                          {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-[#D8741F]" />}
                          <span className={`truncate text-sm ${isUnread ? "font-black" : "font-semibold"}`}>{email.fromName || email.from}</span>
                        </div>
                        <time className="shrink-0 text-[11px] font-medium text-black/40">{formatDate(email.date)}</time>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">{email.subject}</h3>
                        <span className="shrink-0 rounded-full bg-black/5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-black/45">{email.emailType || "unknown"}</span>
                        {email.hasAttachments && <span className="shrink-0 text-xs text-black/40">📎</span>}
                      </div>
                      <p className="mt-1 truncate text-xs text-black/45">{email.preview || "No message preview available."}</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
