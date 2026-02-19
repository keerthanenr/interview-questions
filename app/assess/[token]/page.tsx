export default function AssessmentLandingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <main className="mesh-gradient min-h-dvh flex items-center justify-center">
      <h1 className="text-4xl font-bold">Assessment Instructions</h1>
    </main>
  );
}
