"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Coffee,
  Loader2,
  MapPin,
  Search,
  PartyPopper,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RsvpForm } from "@/components/rsvp-form";
import { RsvpList } from "@/components/rsvp-list";
import { CoffeeOptionCard } from "@/components/coffee-option-card";
import { ShareLink } from "@/components/share-link";
import type { Meetup, Rsvp, CoffeeOption } from "@/lib/db/schema";

interface MeetupData {
  meetup: Omit<Meetup, "creatorToken">;
  rsvps: Rsvp[];
  coffeeOptions: CoffeeOption[];
  isCreator: boolean;
}

export default function MeetupPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [data, setData] = useState<MeetupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [findingSpots, setFindingSpots] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const lastJson = useRef("");

  const fetchMeetup = useCallback(async () => {
    try {
      const res = await fetch(`/api/meetups/${code}`);
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (res.ok) {
        const text = await res.text();
        if (text !== lastJson.current) {
          lastJson.current = text;
          setData(JSON.parse(text));
        }
      }
    } catch {
      toast.error("Failed to load meetup");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchMeetup();
  }, [fetchMeetup]);

  // Poll for updates every 5 seconds
  useEffect(() => {
    const interval = setInterval(fetchMeetup, 5000);
    return () => clearInterval(interval);
  }, [fetchMeetup]);

  const handleFindSpots = async () => {
    setFindingSpots(true);
    try {
      const res = await fetch(`/api/meetups/${code}/find-spots`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Found coffee spots!");
        fetchMeetup();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to find spots");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setFindingSpots(false);
    }
  };

  const handlePick = async (placeId: string) => {
    try {
      const res = await fetch(`/api/meetups/${code}/pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      });
      if (res.ok) {
        toast.success("Spot picked! Everyone will be notified.");
        fetchMeetup();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to pick spot");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  if (loading) {
    return (
      <main className="min-h-dvh mesh-gradient flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </main>
    );
  }

  if (notFound || !data) {
    return (
      <main className="min-h-dvh mesh-gradient flex items-center justify-center">
        <div className="text-center space-y-4 animate-slide-up">
          <Coffee className="size-12 text-muted-foreground mx-auto" />
          <h1 className="text-2xl font-bold">Meetup not found</h1>
          <p className="text-muted-foreground">
            This link might be expired or invalid.
          </p>
          <a href="/" className="text-primary hover:underline text-sm">
            Create a new meetup
          </a>
        </div>
      </main>
    );
  }

  const { meetup, rsvps, coffeeOptions, isCreator } = data;
  const goingCount = rsvps.filter((r) => r.status === "going").length;
  const locationsShared = rsvps.filter(
    (r) => r.status === "going" && r.latitude
  ).length;

  // Build rsvp name map for distance labels
  const rsvpNames: Record<string, string> = {};
  for (const r of rsvps) {
    rsvpNames[r.id] = r.name;
  }

  // Find the chosen option if meetup is decided
  const chosenOption = meetup.status === "decided"
    ? coffeeOptions.find((o) => o.googlePlaceId === meetup.chosenPlaceId)
    : null;

  return (
    <main className="min-h-dvh mesh-gradient">
      <div className="mx-auto max-w-lg px-4 py-8 sm:py-12 space-y-6">
        {/* Header */}
        <div className="text-center animate-slide-up">
          <a href="/" className="inline-block mb-4">
            <span className="text-sm font-semibold text-primary tracking-wide">
              coffeerun
            </span>
          </a>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            {meetup.title}
          </h1>
          {meetup.description && (
            <p className="text-muted-foreground">{meetup.description}</p>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Hosted by {meetup.creatorName}
          </p>
        </div>

        {/* Share link */}
        <div className="animate-slide-up delay-100">
          <ShareLink shareCode={code} />
        </div>

        {/* Decided state */}
        {meetup.status === "decided" && chosenOption && (
          <div className="animate-scale-in">
            <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6 text-center space-y-4">
              <PartyPopper className="size-10 text-primary mx-auto" />
              <h2 className="text-xl font-bold">Spot picked!</h2>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-primary">
                  {chosenOption.name}
                </h3>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                  <MapPin className="size-3" />
                  {chosenOption.address}
                </p>
              </div>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(chosenOption.name)}&query_place_id=${chosenOption.googlePlaceId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <Button size="lg">
                  Get directions
                  <ExternalLink className="ml-2 size-4" />
                </Button>
              </a>
            </div>
          </div>
        )}

        {/* RSVPs section */}
        <div className="glass-card rounded-2xl p-5 space-y-4 animate-slide-up delay-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Who&apos;s going{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({goingCount})
              </span>
            </h2>
            {locationsShared > 0 && (
              <span className="text-xs text-muted-foreground">
                {locationsShared} location{locationsShared !== 1 ? "s" : ""} shared
              </span>
            )}
          </div>
          <RsvpList rsvps={rsvps} />
        </div>

        {/* RSVP form (only when open) */}
        {meetup.status === "open" && (
          <div className="glass-card rounded-2xl p-5 space-y-4 animate-slide-up delay-300">
            <h2 className="text-lg font-semibold">RSVP</h2>
            <RsvpForm shareCode={code} onRsvpCreated={fetchMeetup} />
          </div>
        )}

        {/* Find spots button (creator only, when open) */}
        {isCreator && meetup.status === "open" && (
          <div className="animate-slide-up delay-400">
            <Button
              size="lg"
              className="w-full text-base font-semibold"
              onClick={handleFindSpots}
              disabled={findingSpots || locationsShared < 2}
            >
              {findingSpots ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 size-5" />
                  Find coffee spots
                </>
              )}
            </Button>
            {locationsShared < 2 && (
              <p className="text-xs text-muted-foreground text-center mt-2">
                Need at least 2 people with locations to find spots
              </p>
            )}
          </div>
        )}

        {/* Coffee options (when found) */}
        {coffeeOptions.length > 0 && meetup.status === "open" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold animate-slide-up">
              Coffee spots{" "}
              <span className="text-muted-foreground font-normal text-sm">
                ({coffeeOptions.length})
              </span>
            </h2>
            {coffeeOptions
              .sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0))
              .map((option, i) => (
                <CoffeeOptionCard
                  key={option.id}
                  option={option}
                  rank={i + 1}
                  isCreator={isCreator}
                  rsvpNames={rsvpNames}
                  onPick={handlePick}
                />
              ))}
          </div>
        )}
      </div>
    </main>
  );
}
