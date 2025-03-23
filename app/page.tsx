import { use } from "react";

import TheRing from "@/components/Client";

type PageProps = {
  searchParams: Promise<{ name: string | undefined }>;
};

export default function TheRingPage(props: PageProps) {
  const { name } = use(props.searchParams);

  return (
    <main className="w-full h-lvh">
      <TheRing name={name} />
    </main>
  );
}
