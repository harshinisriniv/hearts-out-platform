"use client";

import { useState, type ReactNode } from "react";
import { Sparkles, Send, Loader2, Heart } from "lucide-react";
import { askAssistant } from "@/app/(app)/assistant/actions";

type ChatTurn = { question: string; answer: string };

const SUGGESTIONS = [
  "How much have we raised this year?",
  "What items are low on stock?",
  "Who are our top donors?",
  "What's coming up this week?",
];

// Minimal **bold**/bullet/paragraph formatter, no markdown lib needed
function FormattedAnswer({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);

  return (
    <div className="space-y-2">
      {blocks.map((block, blockIndex) => {
        const lines = block.split("\n").filter((l) => l.trim());
        const isList = lines.every((l) => /^[-*]\s/.test(l.trim()));

        if (isList) {
          return (
            <ul key={blockIndex} className="space-y-1 pl-1">
              {lines.map((line, i) => (
                <li key={i} className="flex gap-1.5">
                  <span className="text-brick">•</span>
                  <span>{renderInline(line.replace(/^[-*]\s/, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={blockIndex}>
            {lines.map((line, i) => (
              <span key={i}>
                {renderInline(line)}
                {i < lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function renderInline(line: string): ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="text-ink font-semibold">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export function AskAssistant() {
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleAsk(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    setQuestion("");
    setLoading(true);
    try {
      const answer = await askAssistant(trimmed);
      setHistory((prev) => [...prev, { question: trimmed, answer }]);
    } catch {
      setHistory((prev) => [
        ...prev,
        { question: trimmed, answer: "Something went wrong answering that — try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pop-card bg-paper-raised rounded-2xl p-5 flex flex-col">
      <h3 className="font-display text-lg text-ink flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-brick" />
        Ask about your data
      </h3>

      {history.length === 0 ? (
        <div className="flex flex-wrap gap-2 mb-1">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => handleAsk(s)}
              className="text-xs border border-line rounded-full px-3 py-1.5 text-ink-soft hover:border-brick hover:text-brick transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-4 mb-3 max-h-72 overflow-y-auto pr-1">
          {history.map((turn, i) => (
            <div key={i} className="space-y-2">
              {/* User question — right-aligned bubble */}
              <div className="flex justify-end">
                <div className="bg-sage-soft text-ink rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm max-w-[85%]">
                  {turn.question}
                </div>
              </div>
              {/* Assistant answer — left-aligned with a little heart avatar */}
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-full bg-brick flex items-center justify-center shrink-0 mt-0.5">
                  <Heart className="w-3 h-3 text-paper-raised" fill="currentColor" />
                </div>
                <div className="bg-paper border border-line rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-ink-soft max-w-[85%]">
                  <FormattedAnswer text={turn.answer} />
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 rounded-full bg-brick flex items-center justify-center shrink-0">
                <Heart className="w-3 h-3 text-paper-raised" fill="currentColor" />
              </div>
              <div className="bg-paper border border-line rounded-2xl rounded-tl-sm px-3.5 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-ink-soft" />
              </div>
            </div>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(question);
        }}
        className="flex items-center gap-2 mt-auto"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question about your data…"
          disabled={loading}
          className="flex-1 rounded-full border-2 border-ink bg-paper px-4 py-2 text-sm text-ink disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          aria-label="Ask"
          className="rounded-full bg-brick text-paper-raised border-2 border-ink p-2.5 hover:bg-brick-dark transition-colors disabled:opacity-50 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}
