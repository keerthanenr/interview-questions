export default function CandidateDossierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="mesh-gradient min-h-dvh flex items-center justify-center">
      <h1 className="text-4xl font-bold">Candidate Dossier</h1>
    </main>
  );
}
