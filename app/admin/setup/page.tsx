import { redirect } from "next/navigation";
import { hasAnyUser } from "@/lib/auth";
import SetupForm from "./SetupForm";

export default async function SetupPage() {
  if (await hasAnyUser()) redirect("/admin/login/");
  const configured = Boolean(process.env.ADMIN_EMAIL);
  return (
    <div className="auth-card">
      <h1>Create the admin account</h1>
      {configured ? (
        <>
          <p>This only works once, for the email set in <code>ADMIN_EMAIL</code>.</p>
          <SetupForm />
        </>
      ) : (
        <p className="alert error">
          Set the <code>ADMIN_EMAIL</code> environment variable to your email address and redeploy, then come back here.
        </p>
      )}
    </div>
  );
}
