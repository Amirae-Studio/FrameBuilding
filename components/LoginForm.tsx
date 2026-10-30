"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { createClient } from "../lib/supabase/client";
import { sendEmailAction } from "../app/actions/sendemail";

type Status = "idle" | "google" | "sending" | "sent" | "error";

export function LoginForm({
  next,
  hadError,
}: {
  next: string;
  hadError?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>(hadError ? "error" : "idle");
  const [message, setMessage] = useState(
    hadError ? "That sign-in link didn't work — please try again." : ""
  );

  const callback = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  // 1. Google OAuth (Direct Supabase - Free & No Limit)
  async function signInWithGoogle() {
    setStatus("google");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // OAuth can't carry user metadata — the app is recorded in
        // /auth/callback via add_profile_project('building') instead.
        redirectTo: callback(),
      }
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    }
  }

  // 2. Email Magic Link (Bypasses Supabase SMTP limits using Resend API)
  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");

    // Resend action vazhiya email send panrom
    const result = await sendEmailAction(email.trim(), callback());

    if (!result.success) {
      setStatus("error");
      setMessage(result.error || "Failed to send email");
    } else {
      setStatus("sent");
    }
  }
  if (status === "sent") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="fb-card px-7 pb-9 pt-5"
        style={{ "--c": "#8b84cc", "--strip": "#a3a4e4" } as React.CSSProperties}
      >
        <div className="fb-card-top">
          <span>MAGIC LINK</span>
          <span>SENT</span>
        </div>
        <div className="fb-serif-light mt-8 text-[34px] leading-[1.07] text-[#f5ecec]">Check your inbox</div>
        <p className="m-0 mt-4 text-[13px] font-light leading-[1.5] text-white/75">
          We sent a sign-in link to <span className="text-white">{email}</span>. Open it on this device to
          continue.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-6 text-[13px] text-white transition-[letter-spacing] duration-300 hover:tracking-[0.03em]"
        >
          Use a different email &rarr;
        </button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col">
      <button
        onClick={signInWithGoogle}
        disabled={status === "google"}
        className="fb-btn fb-btn-outline w-full"
      >
        <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#4285F4"
            d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.87c2.27-2.09 3.58-5.17 3.58-8.81Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.27 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.29a12 12 0 0 0 0 10.74l3.98-3.09Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.76c1.76 0 3.35.6 4.6 1.8l3.43-3.44A11.98 11.98 0 0 0 1.29 6.63l3.98 3.09C6.22 6.87 8.87 4.76 12 4.76Z"
          />
        </svg>
        {status === "google" ? "Redirecting…" : "Continue with Google"}
      </button>

      <div className="my-8 flex items-center gap-4">
        <span className="h-px flex-1 bg-[var(--line-light)]" />
        <span className="fb-label">or</span>
        <span className="h-px flex-1 bg-[var(--line-light)]" />
      </div>

      <form onSubmit={sendMagicLink} className="flex flex-col">
        <label className="fb-field">
          <span>Email address*</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>
        <button type="submit" disabled={status === "sending"} className="fb-btn fb-btn-rose mt-8 w-full">
          {status === "sending" ? (
            "Sending link…"
          ) : (
            <>
              Email me a sign-in link <span className="arr">&rarr;</span>
            </>
          )}
        </button>
      </form>

      {status === "error" && (
        <p className="m-0 mt-5 text-center text-[13px] text-rose-ink">{message}</p>
      )}

      <p className="fb-hint m-0 mt-8">
        No password needed. We use your Google account or a one-time email link.
      </p>
    </div>
  );
}
