"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InviteCandidateButton({
  assessmentId,
}: {
  assessmentId: string;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/assess/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId,
          email: email.trim(),
          fullName: fullName.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to invite");

      const data = await res.json();
      setInviteLink(data.assessmentLink);
      toast.success("Candidate invited!");
      router.refresh();
    } catch {
      toast.error("Failed to invite candidate");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopy() {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success("Link copied to clipboard");
    }
  }

  function handleClose() {
    setIsOpen(false);
    setEmail("");
    setFullName("");
    setInviteLink(null);
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} size="sm" variant="outline">
        <svg
          className="mr-1.5 h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          viewBox="0 0 24 24"
        >
          <path
            d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Invite
      </Button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md animate-slide-up rounded-xl border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-semibold">Invite Candidate</h3>

        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm">
              Share this link with the candidate to start their assessment:
            </p>
            <div className="flex items-center gap-2">
              <Input
                className="font-mono text-xs"
                readOnly
                value={inviteLink}
              />
              <Button onClick={handleCopy} size="sm">
                Copy
              </Button>
            </div>
            <Button className="w-full" onClick={handleClose} variant="ghost">
              Done
            </Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleInvite}>
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email (required)</Label>
              <Input
                id="invite-email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="candidate@example.com"
                required
                type="email"
                value={email}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-name">Name (optional)</Label>
              <Input
                id="invite-name"
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Smith"
                value={fullName}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                className="flex-1"
                disabled={!email.trim() || isSubmitting}
                type="submit"
              >
                {isSubmitting ? "Inviting..." : "Send Invite"}
              </Button>
              <Button onClick={handleClose} type="button" variant="ghost">
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
