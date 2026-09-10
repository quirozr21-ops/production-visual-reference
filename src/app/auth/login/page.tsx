import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; created?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "48px auto" }}>
        <h1>Production Visual Reference</h1>
        <p className="muted">Company authentication is required to access controlled visual references.</p>
        {params.error ? <div className="status danger">{params.error}</div> : null}
        {params.created ? (
          <div className="status success">
            Account request created. Check your email and confirm the address before signing in.
          </div>
        ) : null}
        <form className="search-form" style={{ marginTop: 18 }}>
          <input type="hidden" name="next" value={params.next ?? "/admin"} />
          <label>
            Email
            <input className="input" name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input className="input" name="password" type="password" autoComplete="current-password" minLength={12} required />
          </label>
          <button className="button" formAction={login}>Sign in</button>
          <button className="button secondary" formAction={signup}>Create first-time account</button>
        </form>
        <p className="muted" style={{ marginTop: 14 }}>
          New accounts receive the lowest application permission by default unless a one-time administrator bootstrap has been prepared.
        </p>
      </div>
    </main>
  );
}
