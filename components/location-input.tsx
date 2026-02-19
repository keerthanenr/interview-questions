"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGeolocation } from "@/hooks/use-geolocation";

interface LocationInputProps {
  onLocationSet: (location: {
    latitude: number;
    longitude: number;
    addressText?: string;
  }) => void;
}

export function LocationInput({ onLocationSet }: LocationInputProps) {
  const { latitude, longitude, error, loading, requestLocation } =
    useGeolocation();
  const [addressMode, setAddressMode] = useState(false);
  const [address, setAddress] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

  // When geolocation succeeds, pass it up (in an effect, not during render)
  const didNotify = useRef(false);
  useEffect(() => {
    if (latitude && longitude && !resolvedAddress && !didNotify.current) {
      didNotify.current = true;
      onLocationSet({ latitude, longitude });
    }
  }, [latitude, longitude, resolvedAddress, onLocationSet]);

  const handleGeocodeAddress = async () => {
    if (!address.trim()) return;
    setGeocoding(true);
    try {
      const res = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (res.ok) {
        const data = await res.json();
        setResolvedAddress(data.formattedAddress);
        onLocationSet({
          latitude: data.latitude,
          longitude: data.longitude,
          addressText: data.formattedAddress,
        });
      }
    } catch {
      // Geocoding failed silently
    } finally {
      setGeocoding(false);
    }
  };

  const hasLocation = (latitude && longitude) || resolvedAddress;

  if (hasLocation) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2 text-sm">
        <Check className="size-4 text-green-500 shrink-0" />
        <span className="text-muted-foreground truncate">
          {resolvedAddress || "Location shared"}
        </span>
      </div>
    );
  }

  if (addressMode) {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Type your address or postcode..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleGeocodeAddress()}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleGeocodeAddress}
            disabled={geocoding || !address.trim()}
          >
            {geocoding ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Find"
            )}
          </Button>
        </div>
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
          onClick={() => setAddressMode(false)}
        >
          Or use GPS instead
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={requestLocation}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Navigation className="size-4" />
        )}
        {loading ? "Getting location..." : "Share my location"}
      </Button>
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
      <button
        type="button"
        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        onClick={() => setAddressMode(true)}
      >
        <MapPin className="size-3" />
        Type address instead
      </button>
    </div>
  );
}
