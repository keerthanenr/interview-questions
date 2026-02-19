export default function CompletePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <main className="mesh-gradient min-h-dvh flex items-center justify-center">
      <h1 className="text-4xl font-bold">Assessment Complete</h1>
    </main>
  );
}
