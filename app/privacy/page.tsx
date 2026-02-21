import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function PrivacyPolicyPage() {
  return (
    <main className="mesh-gradient min-h-dvh px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <Link
          className="mb-8 inline-flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
          href="/"
        >
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to {APP_NAME}
        </Link>
        <h1 className="mb-6 font-bold text-3xl">Privacy Policy</h1>
        <div className="glass-card space-y-4 rounded-xl p-6 text-muted-foreground text-sm leading-relaxed">
          <p>
            <strong className="text-foreground">{APP_NAME}</strong> is committed
            to protecting your privacy. This privacy policy explains how we
            collect, use, and safeguard your data.
          </p>
          <p>
            This page is a placeholder and will be updated with our full privacy
            policy before public launch. If you have questions about our data
            practices, please contact us at{" "}
            <span className="text-primary">privacy@reactassess.com</span>.
          </p>
          <p className="text-xs">Last updated: February 2026</p>
        </div>
      </div>
    </main>
  );
}
