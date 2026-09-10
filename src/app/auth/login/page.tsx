import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "48px auto" }}>
        <h1>Sign in</h1>
        <p className="muted">Company authentication is required to access controlled visual references.</p>
        {params.error ? <div className="status danger">{params.error}</div> : null}
        <form action={login} className="search-form" style={{ marginTop: 18 }}>
          <input type="hidden" name="next" value={params.next ?? "/"} />
          <label>
            Email
            <input className="input" name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input className="input" name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="button" type="submit">Sign in</button>
        </form>
      </div>
    </main>
  );
}
