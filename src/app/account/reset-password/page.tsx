"use client";

// app/reset-password/page.tsx
//
// Drop this in as: app/reset-password/page.tsx
// Assumes you have a Supabase browser client exported from lib/supabase/client.ts, e.g.:
//
//   import { createBrowserClient } from "@supabase/ssr";
//   export const supabase = createBrowserClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
//   );
//
// If your client lives somewhere else, just update the import path below.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type Status = "checking" | "ready" | "invalid" | "submitting" | "success" | "error";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Step 1: pick up the recovery session that Supabase set up after
  // redirecting back from ConfirmationURL.
  useEffect(() => {
    // Handles the PKCE flow, where the URL looks like ?code=xxxxx
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");

    if (code) {
      supabase.auth
        .exchangeCodeForSession(code)
        .then(({ error }) => {
          setStatus(error ? "invalid" : "ready");
        });
      return;
    }

    // Handles the implicit flow, where Supabase fires PASSWORD_RECOVERY
    // once it parses the access_token out of the URL hash automatically.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY") {
          setStatus("ready");
        }
      }
    );

    // If neither a code nor a recovery event shows up quickly, the link
    // was likely invalid, expired, or already used.
    const timeout = setTimeout(() => {
      setStatus((current) => (current === "checking" ? "invalid" : current));
    }, 3000);

    return () => {
      authListener.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("Passwords don't match.");
      return;
    }

    setStatus("submitting");

    // Step 4: actually update the password using the active recovery session.
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage(error.message);
      setStatus("ready");
      return;
    }

    setStatus("success");
    setTimeout(() => router.push("/login"), 2000);
  }

  if (status === "checking") {
    return (
      <div style={styles.wrap}>
        <p style={styles.muted}>Verifying your reset link…</p>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div style={styles.wrap}>
        <h1 style={styles.heading}>This link isn
          
          &apos;t valid</h1>
        <p style={styles.muted}>
          It may have expired or already been used. Request a new password
          reset email and try again.
        </p>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div style={styles.wrap}>
        <h1 style={styles.heading}>Password updated</h1>
        <p style={styles.muted}>Redirecting you to log in…</p>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <h1 style={styles.heading}>Set a new password</h1>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
          minLength={8}
          required
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={styles.input}
          minLength={8}
          required
        />
        {errorMessage && <p style={styles.error}>{errorMessage}</p>}
        <button
          type="submit"
          disabled={status === "submitting"}
          style={styles.button}
        >
          {status === "submitting" ? "Updating…" : "Reset Password"}
        </button>
      </form>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: 400,
    margin: "80px auto",
    padding: "0 24px",
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    textAlign: "center",
  },
  heading: { fontSize: 22, fontWeight: 700, color: "#1F1633", marginBottom: 12 },
  muted: { fontSize: 15, color: "#5B5468", lineHeight: 1.6 },
  form: { display: "flex", flexDirection: "column", gap: 12, marginTop: 20 },
  input: {
    padding: "12px 16px",
    borderRadius: 10,
    border: "1px solid #EDE9F5",
    fontSize: 15,
  },
  button: {
    padding: "14px 24px",
    borderRadius: 9999,
    border: "none",
    background: "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)",
    color: "#FFFFFF",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },
  error: { color: "#DC2626", fontSize: 13, margin: 0 },
};
