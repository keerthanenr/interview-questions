"use client";

import { MapPin } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Rsvp } from "@/lib/db/schema";

interface RsvpListProps {
  rsvps: Rsvp[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const statusColors = {
  going: "bg-green-500/10 text-green-400 border-green-500/20",
  maybe: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  declined: "bg-red-500/10 text-red-400 border-red-500/20",
};

const statusLabels = {
  going: "Going",
  maybe: "Maybe",
  declined: "Can't make it",
};

export function RsvpList({ rsvps }: RsvpListProps) {
  if (rsvps.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No RSVPs yet. Share the link to get started!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {rsvps.map((rsvp, i) => (
        <div
          key={rsvp.id}
          className="flex items-center gap-3 rounded-lg bg-secondary/30 px-3 py-2.5 animate-slide-up"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
              {getInitials(rsvp.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate block">
              {rsvp.name}
            </span>
            {rsvp.latitude && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="size-3 shrink-0" />
                {rsvp.addressText || "Location shared"}
              </span>
            )}
          </div>
          <Badge
            variant="outline"
            className={`text-xs shrink-0 ${statusColors[rsvp.status]}`}
          >
            {statusLabels[rsvp.status]}
          </Badge>
        </div>
      ))}
    </div>
  );
}
