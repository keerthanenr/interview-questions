"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationInput } from "@/components/location-input";

interface RsvpFormProps {
  shareCode: string;
  onRsvpCreated: () => void;
}

export function RsvpForm({ shareCode, onRsvpCreated }: RsvpFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"going" | "maybe" | "declined">("going");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    addressText?: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/meetups/${shareCode}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          latitude: location?.latitude,
          longitude: location?.longitude,
          addressText: location?.addressText,
          status,
        }),
      });

      if (res.ok) {
        toast.success("RSVP sent!");
        onRsvpCreated();
        setName("");
        setEmail("");
        setLocation(null);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to RSVP");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions = [
    { value: "going" as const, label: "Going", emoji: "👋" },
    { value: "maybe" as const, label: "Maybe", emoji: "🤔" },
    { value: "declined" as const, label: "Can't", emoji: "😢" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="rsvp-name">Your name</Label>
        <Input
          id="rsvp-name"
          placeholder="Jane"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="rsvp-email">Email</Label>
        <Input
          id="rsvp-email"
          type="email"
          placeholder="jane@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Are you going?</Label>
        <div className="flex gap-2">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatus(opt.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                status === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
              }`}
            >
              <span className="mr-1">{opt.emoji}</span> {opt.label}
            </button>
          ))}
        </div>
      </div>

      {status !== "declined" && (
        <div className="space-y-2">
          <Label>Your location</Label>
          <LocationInput onLocationSet={setLocation} />
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={submitting || !name.trim() || !email.trim()}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Sending...
          </>
        ) : (
          "RSVP"
        )}
      </Button>
    </form>
  );
}
