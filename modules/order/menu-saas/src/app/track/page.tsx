import { redirect } from "next/navigation";

interface SearchProps {
  searchParams: Promise<{ code?: string }>;
}

// /track?code=GAR-4821 redirects to /track/GAR-4821
export default async function TrackSearchRedirect({ searchParams }: SearchProps) {
  const { code } = await searchParams;
  if (code?.trim()) {
    redirect(`/track/${code.trim().toUpperCase()}`);
  }
  redirect("/");
}
