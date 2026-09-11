import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; passwordUpdated?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "48px auto" }}>
        <h1>Production Visual Reference</h1>
        <p className="muted">
          Company authentication is required to access controlled production visual references.
        </p>
        {params.error ? <div className="status danger">{params.error}</div> : null}
        {params.passwordUpdated ? (
          <div className="status success">
            Password updated successfully. Sign in with your new password.
          </div>
        ) : null}
        <form className="search-form" style={{ marginTop: 18 }} action={login}>
          <input type="hidden" name="next" value={params.next ?? "/"} />
          <label>
            Email
            <input className="input" name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input className="input" name="password" type="password" autoComplete="current-password" minLength={12} required />
          </label>
          <button className="button" type="submit">Sign in</button>
        </form>
        <p style={{ marginTop: 14 }}>
          <Link href="/auth/forgot-password">Forgot your password?</Link>
        </p>
        <p className="muted" style={{ marginTop: 14 }}>
          Access is limited to company-authorized accounts. Contact an administrator if you need access.
        </p>
      </div>
    </main>
  );
}
