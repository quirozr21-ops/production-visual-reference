import Link from "next/link";
import { requestPasswordReset } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="shell">
      <div className="card" style={{ maxWidth: 520, margin: "48px auto" }}>
        <h1>Reset password</h1>
        <p className="muted">
          Enter the email address for your Production Visual Reference account.
        </p>
        {params.error ? <div className="status danger">{params.error}</div> : null}
        {params.sent ? (
          <div className="status success">
            Password reset email sent. Open the email on this same computer and browser, then follow the link.
          </div>
        ) : null}
        <form className="search-form" style={{ marginTop: 18 }} action={requestPasswordReset}>
          <label>
            Email
            <input className="input" name="email" type="email" autoComplete="email" required />
          </label>
          <button className="button" type="submit">Send reset email</button>
        </form>
        <p style={{ marginTop: 14 }}>
          <Link href="/auth/login">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}
