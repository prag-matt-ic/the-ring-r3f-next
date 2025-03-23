import type { Metadata } from "next";
import { use } from "react";

import TheRing from "@/components/Client";

export const metadata: Metadata = {
  title: "The Ring with React Three Fiber & WebGPU",
  description: "The Ring movie poster effect using WebGPU",
};

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
