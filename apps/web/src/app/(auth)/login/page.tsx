import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const cookieStore = await cookies();
  if (cookieStore.get("payload-token")) {
    redirect("/");
  }

  const isDemoMode = process.env.DEMO_MODE === "true";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-gray-900">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          {/* TideMeter Logo */}
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/20">
            <svg className="h-8 w-8 text-white" viewBox="0 0 28 28" fill="none">
              <path
                d="M5 20 L9 11 L14 16 L19 7 L23 12"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Sign in to your TideMeter dashboard
          </p>
        </div>
        {isDemoMode && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-center text-sm text-blue-700 dark:text-blue-300">
              Demo mode — log in with{" "}
              <span className="font-semibold">demo@demo.com</span> /{" "}
              <span className="font-semibold">demodemo</span>
            </p>
          </div>
        )}
        <LoginForm />
        <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
          Privacy-focused web analytics
        </p>
      </div>
    </div>
  );
}
