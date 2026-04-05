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
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-4 shadow-sm dark:border-blue-800 dark:bg-blue-900/20">
            <p className="text-center text-sm font-semibold text-blue-800 dark:text-blue-200">
              Demo mode credentials
            </p>
            <div className="mt-3 space-y-2 rounded-lg bg-white/70 p-3 dark:bg-gray-900/40">
              <div className="flex items-center justify-between gap-3 rounded-md bg-blue-100/70 px-3 py-2 dark:bg-blue-950/40">
                <span className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  Username
                </span>
                <span className="font-mono text-sm font-semibold text-blue-900 dark:text-blue-100">
                  demo@demo.com
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-blue-100/70 px-3 py-2 dark:bg-blue-950/40">
                <span className="text-xs font-medium uppercase tracking-wide text-blue-700 dark:text-blue-300">
                  Password
                </span>
                <span className="font-mono text-sm font-semibold text-blue-900 dark:text-blue-100">
                  demodemo
                </span>
              </div>
            </div>
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
