"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type Source = { kind: string; ref: string; title: string; url?: string };
type Msg = { role: "user" | "assistant"; text: string; sources?: Source[]; attachments?: { name: string }[]; download?: { url: string; filename: string } };
type Conv = { id: string; title: string | null; updatedAt: string };

const SUGGESTIONS = [
  "How does the five-step revenue model under §23 work?",
  "Does a lease go on the balance sheet under the revised §20?",
  "What are the capital allowances on a company van?",
];

function srcLabel(s: Source) {
  if (s.kind === "frs") return `FRS 102 §${s.ref}`;
  if (s.kind === "hmrc") return `HMRC ${s.ref}`;
  return s.title || s.ref || "Firm";
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function b64ToBlob(b64: string, type: string): Blob {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type });
}

export default function Chat({
  user,
  signOutAction,
}: {
  user: { name: string | null; email: string };
  signOutAction: () => Promise<void>;
}) {
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [deep, setDeep] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [attachQueue, setAttachQueue] = useState<File[]>([]);
  const [attachError, setAttachError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  // Once a thread is opened, keep its messages in memory so re-opening is instant.
  const cacheRef = useRef<Record<string, Msg[]>>({});

  const MAX_IMAGE = 3.75 * 1024 * 1024;
  const MAX_DOC = 4.5 * 1024 * 1024;

  function addFiles(list: File[]) {
    const ok: File[] = [];
    let rejected = false;
    for (const f of list) {
      const isImage = f.type.startsWith("image/");
      const limit = isImage ? MAX_IMAGE : MAX_DOC;
      if (f.size > limit) {
        rejected = true;
        continue;
      }
      ok.push(f);
    }
    if (rejected) setAttachError(`Some files were too large (max ${Math.round(MAX_DOC / 1024 / 1024)}MB) and were skipped.`);
    else setAttachError("");
    if (ok.length) setAttachQueue((q) => [...q, ...ok]);
  }

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = ""; // allow re-picking the same file
  }

  function onPaste(e: React.ClipboardEvent) {
    const imgs: File[] = [];
    for (const item of Array.from(e.clipboardData?.items ?? [])) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) imgs.push(f);
      }
    }
    if (imgs.length) {
      e.preventDefault();
      addFiles(imgs);
    }
  }

  function removeAttachment(i: number) {
    setAttachQueue((q) => q.filter((_, k) => k !== i));
  }

  const scrollDown = () =>
    requestAnimationFrame(() => streamRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }));

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/articled/conversations");
        const data = await res.json();
        const list: Conv[] = data.conversations ?? [];
        setConversations(list);
        if (list.length) openChat(list[0].id);
      } catch {
        /* empty state */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openChat(id: string) {
    setActiveId(id);
    setSidebarOpen(false);
    // Instant if we've already loaded this thread this session.
    const cached = cacheRef.current[id];
    if (cached) {
      setMessages(cached);
      scrollDown();
      return;
    }
    setMessages([]);
    setLoadingThread(true);
    try {
      const res = await fetch(`/api/articled/conversations/${id}`);
      const data = await res.json();
      const msgs: Msg[] = data.messages ?? [];
      cacheRef.current[id] = msgs;
      setMessages(msgs);
      scrollDown();
    } catch {
      /* leave empty */
    } finally {
      setLoadingThread(false);
    }
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setSidebarOpen(false);
  }

  async function deleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetch(`/api/articled/conversations/${id}`, { method: "DELETE" });
    } catch {
      /* ignore */
    }
    setConversations((cs) => cs.filter((c) => c.id !== id));
    delete cacheRef.current[id];
    if (id === activeId) newChat();
  }

  async function send(text: string) {
    const q = text.trim();
    const files = attachQueue;
    if ((!q && files.length === 0) || busy) return;
    setInput("");
    setAttachQueue([]);
    setAttachError("");

    let cid = activeId;
    if (!cid) {
      try {
        const res = await fetch("/api/articled/conversations", { method: "POST" });
        const data = await res.json();
        cid = data.id as string;
        setActiveId(cid);
        setConversations((c) => [
          { id: cid as string, title: q.slice(0, 60) || "Document review", updatedAt: new Date().toISOString() },
          ...c,
        ]);
      } catch {
        setMessages((m) => [...m, { role: "assistant", text: "Couldn't start a new conversation — please try again." }]);
        return;
      }
    }

    setMessages((m) => {
      const next: Msg[] = [...m, { role: "user", text: q, attachments: files.map((f) => ({ name: f.name })) }];
      cacheRef.current[cid as string] = next;
      return next;
    });
    setBusy(true);
    scrollDown();
    try {
      const sheet = files.find((f) => /\.xlsx$/i.test(f.name));
      let assistantMsg: Msg;

      if (sheet) {
        // Spreadsheet: run the "do work on it" pipeline and offer the result for download.
        const fd = new FormData();
        fd.append("file", sheet);
        fd.append("instruction", q);
        fd.append("conversationId", cid as string);
        const res = await fetch("/api/articled/worksheet", { method: "POST", body: fd });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        let download: Msg["download"];
        if (data.fileId) {
          download = { url: `/api/articled/files/${data.fileId}`, filename: data.filename ?? "completed.xlsx" };
        } else if (data.fileBase64) {
          const blob = b64ToBlob(data.fileBase64, XLSX_MIME);
          download = { url: URL.createObjectURL(blob), filename: data.filename ?? "completed.xlsx" };
        }
        assistantMsg = { role: "assistant", text: data.summary ?? "", download };
      } else if (files.length) {
        const fd = new FormData();
        fd.append("question", q);
        fd.append("conversationId", cid as string);
        fd.append("deep", String(deep));
        for (const f of files) fd.append("files", f);
        const res = await fetch("/api/articled/assistant", { method: "POST", body: fd }); // browser sets multipart boundary
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        assistantMsg = { role: "assistant", text: data.answer ?? "", sources: data.sources };
      } else {
        const res = await fetch("/api/articled/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, conversationId: cid, deep }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        assistantMsg = { role: "assistant", text: data.answer ?? "", sources: data.sources };
      }

      setMessages((m) => {
        const next: Msg[] = [...m, assistantMsg];
        cacheRef.current[cid as string] = next;
        return next;
      });
      setConversations((cs) => {
        const found = cs.find((c) => c.id === cid);
        const title = found?.title || q.slice(0, 60) || "Spreadsheet";
        return [{ id: cid as string, title, updatedAt: new Date().toISOString() }, ...cs.filter((c) => c.id !== cid)];
      });
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Sorry — something went wrong. Please try again." }]);
    } finally {
      setBusy(false);
      scrollDown();
    }
  }

  return (
    <div className="root">
      <aside className={`kb ${sidebarOpen ? "open" : ""}`}>
        <div className="kb-head">
          <div className="kb-head-row">
            <span className="kb-title">Conversations</span>
            <button className="kb-x" onClick={() => setSidebarOpen(false)} aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
          <button className="cv-new" onClick={newChat}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
            New chat
          </button>
        </div>
        <div className="kb-scroll">
          {conversations.length === 0 ? (
            <div className="cv-empty">Your conversations will appear here once you start one.</div>
          ) : (
            <div className="cv-list">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  className={`cv-item ${c.id === activeId ? "active" : ""}`}
                  onClick={() => openChat(c.id)}
                >
                  <span className="cv-item-title">{c.title || "New chat"}</span>
                  <span className="cv-del" onClick={(e) => deleteChat(c.id, e)} aria-label="Delete" role="button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </aside>

      {sidebarOpen && <div className="scrim" onClick={() => setSidebarOpen(false)} />}

      <div className="main">
        <div className="top">
          <button className="hamb" onClick={() => setSidebarOpen(true)} aria-label="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
          </button>
          <div className="brand">
            <div className="brand-mark" style={{ fontFamily: "Spectral, serif", fontWeight: 700 }}>A</div>
            <div>
              <div className="brand-name">Articled</div>
              <div className="brand-sub">FRS 102 · HMRC · firm knowledge</div>
            </div>
          </div>
          <a href="/" className="back-dash" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 4, padding: "6px 11px", borderRadius: 8, border: "1px solid var(--line-2)", color: "var(--text-2)", textDecoration: "none", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
            Dashboard
          </a>
          <span className="top-tag" title={user.email}>{user.name ?? user.email}</span>
          <form action={signOutAction}>
            <button type="submit" style={{ background: "none", border: "1px solid var(--line-2)", borderRadius: 8, padding: "6px 11px", cursor: "pointer", color: "var(--text-2)", fontFamily: "inherit", fontSize: 12.5 }}>
              Sign out
            </button>
          </form>
        </div>

        <div className="stream" ref={streamRef}>
          <div className="stream-inner">
            {loadingThread && (
              <div className="thread-loading">Loading conversation<span className="dots"><i /><i /><i /></span></div>
            )}
            {messages.length === 0 && !loadingThread && (
              <div className="welcome">
                <span className="w-badge">Trainee assistant</span>
                <h1 className="w-title">What can I help you account for?</h1>
                <p className="w-lede">
                  Ask about <strong>FRS 102</strong>, UK tax from the <strong>HMRC manuals</strong>, or the
                  firm&apos;s own templates and process. I&apos;ll cite the section or manual reference, and flag
                  when something needs a manager&apos;s sign-off.
                </p>
                <div className="w-suggest-label">Try</div>
                <div className="w-suggest">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} className="w-chip" onClick={() => send(s)}>
                      {s}
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div className="turn user" key={i}>
                  <div className="bubble-user">
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="msg-attach">
                        {m.attachments.map((a, k) => (
                          <span className="msg-attach-chip" key={k}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                            {a.name}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.text && <p>{m.text}</p>}
                  </div>
                </div>
              ) : (
                <div className="turn" key={i}>
                  <div className="answer">
                    <div className="ans-avatar" style={{ fontFamily: "Spectral, serif", fontWeight: 700 }}>A</div>
                    <div className="ans-body">
                      <div className="md"><ReactMarkdown>{m.text}</ReactMarkdown></div>
                      {m.download && (
                        <a className="dl-btn" href={m.download.url} download={m.download.filename}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                          {m.download.filename}
                        </a>
                      )}
                      {m.sources && m.sources.length > 0 && (
                        <div className="sources">
                          <div className="sources-h">Sources</div>
                          <div className="sources-row">
                            {m.sources
                              .filter((s, k, a) => a.findIndex((x) => srcLabel(x) === srcLabel(s)) === k)
                              .map((s) =>
                                s.url ? (
                                  <a
                                    className="src"
                                    key={srcLabel(s)}
                                    href={s.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Open the live gov.uk guidance"
                                    style={{ textDecoration: "none" }}
                                  >
                                    <span className="src-tag" style={{ cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}>{srcLabel(s)} ↗</span>
                                  </a>
                                ) : (
                                  <span className="src" key={srcLabel(s)}><span className="src-tag">{srcLabel(s)}</span></span>
                                )
                              )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            )}

            {busy && (
              <div className="turn">
                <div className="answer">
                  <div className="ans-avatar pulse" style={{ fontFamily: "Spectral, serif", fontWeight: 700 }}>A</div>
                  <div className="ans-body">
                    <span className="thinking">Looking through the standards<span className="dots"><i /><i /><i /></span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="composer">
          <div className="composer-inner">
            {(attachQueue.length > 0 || attachError) && (
              <div className="attach-row">
                {attachQueue.map((f, i) => (
                  <span className="attach-chip" key={i}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
                    <span className="attach-name">{f.name}</span>
                    <button className="attach-x" onClick={() => removeAttachment(i)} aria-label="Remove">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </span>
                ))}
                {attachError && <span className="attach-err">{attachError}</span>}
              </div>
            )}
            <div className="composer-controls">
              <button
                type="button"
                className={`deep-toggle ${deep ? "on" : ""}`}
                onClick={() => setDeep((v) => !v)}
                title="Use the strongest model (Opus) for this question — best for hard reasoning; slower and more costly."
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l2.2 5.6L20 11l-5.8 2.4L12 19l-2.2-5.6L4 11l5.8-2.4L12 3z" /></svg>
                Deep reasoning
              </button>
              {deep && <span className="deep-note">Opus — for harder questions</span>}
            </div>
            <div
              className="input-wrap"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer?.files?.length) addFiles(Array.from(e.dataTransfer.files));
              }}
            >
              <button className="attach-btn" onClick={() => fileInputRef.current?.click()} aria-label="Attach a file or screenshot">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
              </button>
              <textarea
                rows={1}
                placeholder="Ask a question, or attach a document or screenshot…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={onPaste}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
              />
              <button className="send" disabled={busy || (!input.trim() && attachQueue.length === 0)} onClick={() => send(input)} aria-label="Send">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/png,image/jpeg,image/gif,image/webp,.pdf,.csv,.doc,.docx,.xls,.xlsx,.txt,.md,.html"
              style={{ display: "none" }}
              onChange={onPickFiles}
            />
            <div className="disclaimer">
              Articled is a training aid — verify against the standard and confirm with your manager before acting.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
