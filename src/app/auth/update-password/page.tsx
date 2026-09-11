import { updatePassword } from "./actions";

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "48px auto" }}>
        <h1>Choose a new password</h1>
        <p className="muted">Use at least 12 characters.</p>
        {params.error ? <div className="status danger">{params.error}</div> : null}
        <form className="search-form" style={{ marginTop: 18 }} action={updatePassword}>
          <label>
            New password
            <input className="input" name="password" type="password" autoComplete="new-password" minLength={12} required />
          </label>
          <label>
            Confirm new password
            <input className="input" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} required />
          </label>
          <button className="button" type="submit">Update password</button>
        </form>
      </div>
    </main>
  );
}
