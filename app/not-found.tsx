import { Coffee } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-dvh mesh-gradient flex items-center justify-center">
      <div className="text-center space-y-4 animate-slide-up">
        <Coffee className="size-12 text-muted-foreground mx-auto" />
        <h1 className="text-3xl font-bold">404</h1>
        <p className="text-muted-foreground">
          This page doesn&apos;t exist.
        </p>
        <a href="/" className="text-primary hover:underline text-sm">
          Back to coffeerun
        </a>
      </div>
    </main>
  );
}
