"use client";

import { Suspense, useActionState, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { signIn, signUp } from "@/app/account/actions";
import { brands, palette } from "@/lib/brands";

type AuthState = { error?: string } | null;

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginLoading() {
  return (
    <main
      style={{ background: palette.cream, color: palette.black }}
      className="min-h-screen flex items-center justify-center px-6 py-16"
    >
      <div className="w-full max-w-md">
        <div
          style={{
            background: "white",
            borderColor: "rgba(17,17,17,0.08)",
          }}
          className="border rounded-[22px] p-8"
        >
          <p className="text-center text-sm text-neutral-500">Loading...</p>
        </div>
      </div>
    </main>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();

  const next = searchParams.get("next") ?? "/account";
  const checkEmail = searchParams.get("checkEmail") === "1";

  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

  const [signInState, signInAction, signInPending] = useActionState<
    AuthState,
    FormData
  >(signIn, null);

  const [signUpState, signUpAction, signUpPending] = useActionState<
    AuthState,
    FormData
  >(signUp, null);

  const funkful = brands.funkful;

  return (
    <main
      style={{
        background: palette.cream,
        color: palette.black,
      }}
      className="min-h-screen flex items-center justify-center px-6 py-16"
    >
      <div className="w-full max-w-md">
        <Link href="/" className="flex justify-center mb-8">
          <Image
            src={funkful.logo}
            alt="Funkful"
            width={130}
            height={30}
            className="w-auto"
          />
        </Link>

        <div
          style={{
            background: "white",
            borderColor: "rgba(17,17,17,0.08)",
          }}
          className="border rounded-[22px] p-8"
        >
          <div className="flex gap-2 mb-7">
            <button
              type="button"
              onClick={() => setMode("sign-in")}
              style={
                mode === "sign-in"
                  ? {
                      background: palette.black,
                      color: palette.cream,
                    }
                  : {
                      color: "#7d7568",
                    }
              }
              className="btn primary flex-1 tracking-wide"
            >
              Sign in
            </button>

            <button
              type="button"
              onClick={() => setMode("sign-up")}
              style={
                mode === "sign-up"
                  ? {
                      background: palette.black,
                      color: palette.cream,
                    }
                  : {
                      color: "#7d7568",
                    }
              }
              className="btn secondary tracking-wide"
            >
              Create account
            </button>
          </div>

          {checkEmail && (
            <p
              style={{
                background: palette.sage,
                color: "#1c2617",
              }}
              className="text-xs font-semibold rounded-xl p-3.5 mb-5"
            >
              Almost there — check your inbox to confirm your email before
              signing in.
            </p>
          )}

          {mode === "sign-in" ? (
            <form action={signInAction} className="flex flex-col gap-4">
              <input type="hidden" name="next" value={next} />
              <Field label="Email">
                <input type="email" name="email" required placeholder="you@email.com" style={inputStyle} className="w-full"/>
              </Field>

              <Field label="Password">
                <input type="password" name="password" required placeholder="••••••••" style={inputStyle} className="w-full"/>
              </Field>

              {signInState?.error && (
                <p className="text-xs" style={{ color: "#8a2f2b" }}>
                  {signInState.error}
                </p>
              )}

              <button
                type="submit"
                disabled={signInPending}
                style={{ background: palette.black, color: palette.cream}}
                className="font-extrabold text-xs uppercase tracking-wide py-3.5 rounded-full disabled:opacity-60" >
                {signInPending ? "Signing in…" : "Sign in"}
              </button>
            </form>
          ) : (
            <form action={signUpAction} className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <input type="text"  name="firstName" required placeholder="Thabo" style={inputStyle} className="w-full"/>
                </Field>

                <Field label="Last name">
                  <input type="text" name="lastName" required placeholder="Mokoena" style={inputStyle} className="w-full" />
                </Field>
              </div>

              <Field label="Email">
                <input type="email"  name="email" required placeholder="you@email.com" style={inputStyle} className="w-full"/>
              </Field>

              <Field label="Password">
                <input type="password" name="password" required minLength={6} placeholder="At least 6 characters" style={inputStyle} className="w-full"/>
              </Field>

              {signUpState?.error && (
                <p className="text-xs" style={{ color: "#8a2f2b" }}>
                  {signUpState.error}
                </p>
              )}

              <button
                type="submit"
                disabled={signUpPending}
                style={{
                  background: palette.black,
                  color: palette.cream,
                }}
                className="font-extrabold text-xs uppercase tracking-wide py-3.5 rounded-full disabled:opacity-60"
              >
                {signUpPending ? "Creating account…" : "Create account"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-neutral-500 mt-6">
          <Link href="/" className="underline">
            Back to shopping
          </Link>
        </p>
      </div>
    </main>
  );
}

const inputStyle = {
  borderColor: "rgba(17,17,17,0.2)",
  background: palette.cream,
} as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span
        style={{ color: "#6a6458" }}
        className="text-[11.5px] font-semibold uppercase tracking-wide"
      >
        {label}
      </span>

      <span className="[&>input]:border [&>input]:rounded-xl [&>input]:px-3.5 [&>input]:py-3 [&>input]:text-sm">
        {children}
      </span>
    </label>
  );
}
