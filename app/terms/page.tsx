import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function TermsOfServicePage() {
  return (
    <main className="mesh-gradient min-h-dvh px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-8 inline-flex items-center gap-1"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Back to {APP_NAME}
        </Link>
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <div className="glass-card rounded-xl p-6 text-sm text-muted-foreground space-y-4 leading-relaxed">
          <p>
            Welcome to <strong className="text-foreground">{APP_NAME}</strong>.
            By using our platform, you agree to these terms of service.
          </p>
          <p>
            This page is a placeholder and will be updated with our full terms
            of service before public launch. If you have questions, please
            contact us at{" "}
            <span className="text-primary">legal@reactassess.com</span>.
          </p>
          <p className="text-xs">Last updated: February 2026</p>
        </div>
      </div>
    </main>
  );
}
