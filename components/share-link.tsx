"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ShareLinkProps {
  shareCode: string;
}

export function ShareLink({ shareCode }: ShareLinkProps) {
  const [copied, setCopied] = useState(false);
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/m/${shareCode}`
      : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my coffee meetup!",
          url,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopy();
    }
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 p-2">
      <code className="flex-1 truncate text-xs text-muted-foreground px-2">
        {url}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className="shrink-0"
      >
        {copied ? (
          <Check className="size-4 text-green-500" />
        ) : (
          <Copy className="size-4" />
        )}
      </Button>
      {"share" in navigator && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="shrink-0"
        >
          <Share2 className="size-4" />
        </Button>
      )}
    </div>
  );
}
