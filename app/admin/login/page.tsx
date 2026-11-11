import { redirect } from "next/navigation";
import { getSession, hasAnyUser } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  if (await getSession()) redirect("/admin/");
  if (!(await hasAnyUser())) redirect("/admin/setup/");
  return (
    <div className="auth-card">
      <h1>Admin sign in</h1>
      <LoginForm />
    </div>
  );
}
