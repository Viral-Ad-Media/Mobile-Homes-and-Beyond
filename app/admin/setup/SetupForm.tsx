"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function SetupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (f.get("password") !== f.get("confirm")) return setError("Passwords don't match.");
    setBusy(true);
    setError(null);
    const { error } = await authClient.signUp.email({
      name: String(f.get("name")),
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    setBusy(false);
    if (error) return setError(error.message || "Could not create the account.");
    router.push("/admin/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      {error && <p className="alert error">{error}</p>}
      <div className="field">
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" required />
      </div>
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">Password (10+ characters)</label>
        <input id="password" name="password" type="password" minLength={10} autoComplete="new-password" required />
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirm password</label>
        <input id="confirm" name="confirm" type="password" minLength={10} autoComplete="new-password" required />
      </div>
      <button className="btn" disabled={busy}>{busy ? "Creating…" : "Create admin account"}</button>
    </form>
  );
}
