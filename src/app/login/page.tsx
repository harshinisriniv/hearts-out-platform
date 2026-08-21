"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Heart } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (!res.ok) {
      setError("That password didn't work. Try again.");
      return;
    }

    router.push(params.get("redirect") || "/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-full bg-brick flex items-center justify-center mb-4">
            <Heart className="w-6 h-6 text-paper-raised" fill="currentColor" />
          </div>
          <h1 className="font-display text-2xl text-ink text-center">
            Hearts Out for Homeless
          </h1>
          <p className="font-script text-lg text-brick mt-1">
            operations, made with love
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-paper-raised border border-line rounded-lg p-6 shadow-sm"
        >
          <label
            htmlFor="password"
            className="block text-sm font-medium text-ink mb-2"
          >
            Team password
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-line bg-paper px-3 py-2 text-ink focus-visible:outline-2 focus-visible:outline-brick"
            placeholder="Enter the shared password"
          />

          {error && (
            <p className="text-danger text-sm mt-2" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full mt-4 bg-brick text-paper-raised rounded-md py-2 font-medium hover:bg-brick-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-xs text-ink-soft mt-6">
          Ask your team lead for the shared password if you don&apos;t have it.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
