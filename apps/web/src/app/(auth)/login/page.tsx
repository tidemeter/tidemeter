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
    <div className="relative flex min-h-screen items-center justify-center px-4">
      {/* Background gradient (matches website hero) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-primary-600/8 blur-[120px] dark:bg-primary-600/5" />
      </div>

      <div className="w-full max-w-sm">
        {/* Logo linking to tidemeter.com */}
        <div className="mb-8 text-center">
          <a
            href="https://tidemeter.com"
            className="group mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg shadow-primary-600/20 transition-shadow hover:shadow-xl hover:shadow-primary-600/30"
          >
            <svg className="h-8 w-8 text-white" viewBox="0 0 28 28" fill="none">
              <path
                d="M5 20 L9 11 L14 16 L19 7 L23 12"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Sign in to your TideMeter dashboard
          </p>
        </div>

        {isDemoMode && (
          <div className="mb-5 rounded-xl border border-primary-200 bg-primary-50 px-4 py-4 shadow-sm dark:border-primary-800/40 dark:bg-primary-500/5">
            <p className="text-center text-sm font-semibold text-primary-800 dark:text-primary-200">
              Demo mode credentials
            </p>
            <div className="mt-3 space-y-2 rounded-lg bg-white/70 p-3 dark:bg-gray-900/40">
              <div className="flex items-center justify-between gap-3 rounded-md bg-primary-100/70 px-3 py-2 dark:bg-primary-950/40">
                <span className="text-xs font-medium uppercase tracking-wide text-primary-700 dark:text-primary-300">
                  Username
                </span>
                <span className="font-mono text-sm font-semibold text-primary-900 dark:text-primary-100">
                  demo@demo.com
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md bg-primary-100/70 px-3 py-2 dark:bg-primary-950/40">
                <span className="text-xs font-medium uppercase tracking-wide text-primary-700 dark:text-primary-300">
                  Password
                </span>
                <span className="font-mono text-sm font-semibold text-primary-900 dark:text-primary-100">
                  demodemo
                </span>
              </div>
            </div>
          </div>
        )}

        <LoginForm />

        <p className="mt-6 text-center text-xs text-gray-400 dark:text-gray-600">
          <a
            href="https://tidemeter.com"
            className="transition-colors hover:text-gray-600 dark:hover:text-gray-400"
          >
            tidemeter.com
          </a>
          {" · "}
          Privacy-focused web analytics for developers
        </p>
      </div>
    </div>
  );
}
