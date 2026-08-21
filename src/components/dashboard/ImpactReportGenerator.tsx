"use client";

import { useState } from "react";
import { FileText, Loader2, Copy, Check } from "lucide-react";
import { generateImpactReport } from "@/app/(app)/reports/actions";

function getPresetRange(preset: string): { startDate: string; endDate: string } {
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  let start: Date;

  if (preset === "This Month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (preset === "This Quarter") {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    start = new Date(now.getFullYear(), quarterStartMonth, 1);
  } else if (preset === "This Year") {
    start = new Date(now.getFullYear(), 0, 1);
  } else {
    start = new Date(2020, 0, 1); // "All Time" — comfortably before any real data
  }

  return { startDate: start.toISOString().slice(0, 10), endDate: end };
}

const PRESETS = ["This Month", "This Quarter", "This Year", "All Time"];

const EXAMPLE_REPORT = `This quarter, Hearts Out for Homeless distributed 142 care kits to partner shelters and pantries across the community, directly supporting families and individuals experiencing homelessness with essential hygiene supplies.

Fundraising remained strong, with $3,180 raised through a combination of two community fundraiser events and three restaurant profit-share nights. These partnerships continue to be a reliable, low-effort way to bring in support while building lasting relationships with local businesses.

We also welcomed 2 new partner organizations this quarter, expanding our reach, and received generous item donations from both individual supporters and a local business — including toothbrushes, soap, and children's socks — directly restocking our shelves at no cost.

None of this happens without our volunteers, who assembled and delivered every one of these kits by hand. Thank you for making this quarter possible.`;

export function ImpactReportGenerator() {
  const [preset, setPreset] = useState("This Quarter");
  const [report, setReport] = useState("");
  const [isExample, setIsExample] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  function handleShowExample() {
    setReport(EXAMPLE_REPORT);
    setIsExample(true);
  }

  async function handleGenerate() {
    setLoading(true);
    setReport("");
    setIsExample(false);
    try {
      const { startDate, endDate } = getPresetRange(preset);
      const result = await generateImpactReport({ startDate, endDate, label: preset });
      setReport(result);
    } catch {
      setReport("Something went wrong generating that report — try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="pop-card bg-paper-raised rounded-2xl p-5">
      <h3 className="font-display text-lg text-ink flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-brick" />
        Impact report
      </h3>

      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={`text-xs rounded-full px-3 py-1.5 border transition-colors ${
              preset === p
                ? "bg-brick text-paper-raised border-brick"
                : "border-line text-ink-soft hover:border-brick hover:text-brick"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-brick text-paper-raised border-2 border-ink rounded-xl py-2 text-sm font-medium hover:bg-brick-dark transition-colors disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Writing report…
            </>
          ) : (
            `Generate ${preset} report`
          )}
        </button>
        <button
          onClick={handleShowExample}
          disabled={loading}
          className="text-sm text-ink-soft hover:text-ink border border-line rounded-md px-3 py-2 whitespace-nowrap disabled:opacity-60"
        >
          See example
        </button>
      </div>

      {report && (
        <div className="bg-paper border border-line rounded-md p-4">
          <div className="flex items-center justify-between mb-2">
            {isExample ? (
              <span className="text-xs text-ochre font-medium">Example — not your real data</span>
            ) : (
              <span />
            )}
            <button
              onClick={handleCopy}
              className="text-xs text-ink-soft hover:text-ink flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-sage" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy text"}
            </button>
          </div>
          <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{report}</p>
        </div>
      )}
    </div>
  );
}
