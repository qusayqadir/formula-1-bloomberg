/** Chat — UI for the chat over the historical DB (spec 04).
 *  The backend (app/chatbot) is not exposed over the API yet, so replies
 *  come from a local placeholder; swap `respond()` for the real endpoint
 *  when it lands. Thread state is in-memory only.
 *
 *  Composer is a floating Skiper-style pill (bottom-center): collapsed it is
 *  a single round toggle; expanding springs it open into a typeable field
 *  with an apple-blue send button. */
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, RotateCcw, X } from "lucide-react";
import { useFilters } from "@/state/filters";
import { ThinkingDots } from "@/components/ui/ThinkingDots";
import { SiriOrb } from "@/components/ui/SiriOrb";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Who won the 2021 drivers' championship, and by how many points?",
  "Which team had the most mechanical DNFs in 2016?",
  "Compare Norris and Verstappen over the 2025 season.",
  "At which circuits does pole convert to a win least often?",
];

async function respond(question: string): Promise<string> {
  try {
    const response = await fetch("/api/v1/chatbot/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_query: question }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.answer;
  } catch (error) {
    return `Error: Could not process your question. ${error instanceof Error ? error.message : "Unknown error"}`;
  }
}

export function ChatPage() {
  const { filters } = useFilters();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [thinking, setThinking] = useState(false);
  const nextId = useRef(1);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => () => clearTimeout(replyTimer.current), []);

  // focus the field once the pill has sprung open
  useEffect(() => {
    if (composerOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 180);
      return () => clearTimeout(t);
    }
  }, [composerOpen]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question) return;
    setMessages((m) => [...m, { id: nextId.current++, role: "user", content: question }]);
    setDraft("");
    setComposerOpen(true);
    inputRef.current?.focus();
    setThinking(true);
    clearTimeout(replyTimer.current);

    try {
      const answer = await respond(question);
      setMessages((m) => [
        ...m,
        { id: nextId.current++, role: "assistant", content: answer },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col">
      {/* header */}
      <header className="flex flex-none flex-wrap items-end justify-between gap-2 border-b border-stroke px-5 py-4">
        <div>
          <p className="eyebrow">Home / Chat</p>
          <h1 className="mt-0.5 text-lg font-semibold tracking-tight text-ink">Chat</h1>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-stroke px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-accent">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
          Live · backend connected
        </span>
      </header>

      {/* thread — extra bottom padding keeps content clear of the floating pill */}
      <div ref={threadRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-5 pb-32 pt-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center pt-16 text-center">
              <p className="eyebrow">Ask the database</p>
              <h2 className="mt-2 max-w-md text-xl font-semibold tracking-tight text-ink">
                Every classification, standing and circuit from 2011 to 2025.
              </h2>
              <p className="mt-2 max-w-sm text-xs leading-relaxed text-sub">
                Answers will be grounded in the ingested results database once the chat
                backend is wired up. Try one of these to see the flow:
              </p>
              <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-stroke bg-surface px-3.5 py-3 text-left text-xs leading-relaxed text-sub transition-colors hover:border-stroke-strong hover:text-ink"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md border border-stroke bg-ink/[0.05] px-4 py-2.5">
                      <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
                        {m.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex gap-3">
                    <span
                      aria-hidden
                      className="mt-1 h-4 w-[3px] flex-none -skew-x-12 rounded-[1px] bg-accent"
                    />
                    <div className="min-w-0">
                      <p className="eyebrow !text-mut">F1 Terminal</p>
                      <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">
                        {m.content}
                      </p>
                    </div>
                  </div>
                ),
              )}
              {thinking && (
                <div className="flex gap-3">
                  <span
                    aria-hidden
                    className="mt-1 h-4 w-[3px] flex-none -skew-x-12 rounded-[1px] bg-accent"
                  />
                  <div className="min-w-0">
                    <p className="eyebrow !text-mut">F1 Terminal</p>
                    <div className="mt-2">
                      <ThinkingDots />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* floating composer — Skiper-style expanding pill */}
      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center px-4">
        <motion.div
          layout
          initial={{ scale: 0, y: "100%" }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", bounce: 0.16, layout: { type: "spring", bounce: 0.16 } }}
          style={{ borderRadius: 9999 }}
          className="pointer-events-auto flex h-12 max-w-full items-center overflow-hidden border border-stroke bg-raised shadow-[var(--shadow-pop)]"
        >
          {!composerOpen ? (
            <button
              onClick={() => setComposerOpen(true)}
              aria-label="Ask a question"
              className="flex h-12 items-center gap-2 truncate whitespace-nowrap px-5 text-[13px] text-sub transition-colors hover:text-ink"
            >
              {/* fade the orb+label in only after the pill has shrunk, so no
                  content is visible mid-collapse; the orb only exists while
                  the composer is closed */}
              <motion.span
                key="orb"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.2 }}
                className="flex items-center"
              >
                <SiriOrb size={20} />
              </motion.span>
              <motion.span
                key="label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.2 }}
              >
                Ask AI!
              </motion.span>
            </button>
          ) : (
            <AnimatePresence>
              <motion.div
                key="field"
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ delay: 0.15 }}
                className="flex w-[min(640px,calc(100vw-4rem))] items-center gap-1 pl-1.5 pr-1.5"
              >
                <button
                  onClick={() => setComposerOpen(false)}
                  aria-label="Collapse composer"
                  className="grid h-9 w-9 flex-none place-items-center rounded-full text-mut transition-colors hover:text-ink"
                >
                  <X size={14} />
                </button>
                <input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") send(draft);
                    if (e.key === "Escape") setComposerOpen(false);
                  }}
                  placeholder={`Ask about the ${filters.year} season, a driver, a circuit…`}
                  aria-label="Chat message"
                  className="h-full min-w-0 flex-1 bg-transparent px-1.5 text-[13px] text-ink outline-none placeholder:text-mut"
                />
                {messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    title="Clear conversation"
                    aria-label="Clear conversation"
                    className="grid h-9 w-9 flex-none place-items-center rounded-full text-mut transition-colors hover:bg-ink/[0.05] hover:text-ink"
                  >
                    <RotateCcw size={14} />
                  </button>
                )}
                <motion.button
                  initial={{ opacity: 0, scale: 0.5, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  transition={{ delay: 0.25 }}
                  onClick={() => send(draft)}
                  disabled={!draft.trim()}
                  aria-label="Send message"
                  className="grid h-9 w-9 flex-none place-items-center rounded-full bg-accent text-white transition-opacity hover:opacity-90 active:scale-95 disabled:opacity-30"
                >
                  <ArrowUp size={15} strokeWidth={2.2} />
                </motion.button>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      </div>
    </div>
  );
}
