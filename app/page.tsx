"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coffee, Loader2, MapPin, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LocationInput } from "@/components/location-input";

export default function HomePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    addressText?: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !title.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/meetups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorName: name.trim(),
          creatorEmail: email.trim(),
          title: title.trim(),
          description: description.trim() || undefined,
          latitude: location?.latitude,
          longitude: location?.longitude,
          addressText: location?.addressText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Meetup created!");
        router.push(`/m/${data.shareCode}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create meetup");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-dvh mesh-gradient">
      <div className="mx-auto max-w-lg px-4 py-12 sm:py-20">
        {/* Hero */}
        <div className="mb-10 text-center animate-slide-up">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-primary/10 mb-6 animate-float">
            <Coffee className="size-7 text-primary" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-3">
            coffeerun
          </h1>
          <p className="text-lg text-muted-foreground max-w-sm mx-auto">
            Find the perfect coffee spot between everyone.
            Share a link, RSVP, done.
          </p>
        </div>

        {/* How it works */}
        <div className="mb-8 flex items-center justify-center gap-3 text-xs text-muted-foreground animate-slide-up delay-100">
          <span className="flex items-center gap-1">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">1</span>
            Create
          </span>
          <ArrowRight className="size-3" />
          <span className="flex items-center gap-1">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">2</span>
            Share
          </span>
          <ArrowRight className="size-3" />
          <span className="flex items-center gap-1">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">3</span>
            <MapPin className="size-3" />
            Meet
          </span>
        </div>

        {/* Create form */}
        <form
          onSubmit={handleSubmit}
          className="glass-card rounded-2xl p-6 space-y-4 animate-slide-up delay-200"
        >
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Your name</Label>
              <Input
                id="name"
                placeholder="Alex"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="alex@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">What&apos;s the occasion?</Label>
            <Input
              id="title"
              placeholder="Coffee catch-up"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Add a note{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              id="description"
              placeholder="Let's grab coffee this weekend!"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Your location</Label>
            <LocationInput
              onLocationSet={(loc) => setLocation(loc)}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full text-base font-semibold"
            disabled={
              submitting || !name.trim() || !email.trim() || !title.trim()
            }
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-5 animate-spin" />
                Creating...
              </>
            ) : (
              "Create meetup"
            )}
          </Button>
        </form>
      </div>
    </main>
  );
}
