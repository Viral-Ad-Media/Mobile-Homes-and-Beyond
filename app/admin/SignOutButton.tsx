"use client";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-plain"
      onClick={async () => {
        await authClient.signOut();
        router.push("/admin/login/");
        router.refresh();
      }}
    >
      Sign out
    </button>
  );
}
