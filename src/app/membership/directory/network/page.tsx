import type { Metadata } from "next";
import Link from "next/link";
import { members, getAllCategories } from "@/data/members";
import { MemberGraph } from "../MemberGraph";

export const metadata: Metadata = {
  title: "Member Network View",
  description:
    "Explore the Greater Medina Chamber member network as an interactive graph. Industries and members visualized as a constellation.",
  openGraph: {
    title: "Member Network View | Greater Medina Chamber of Commerce",
    description:
      "Explore chamber members as an interactive network graph.",
  },
  alternates: { canonical: "/membership/directory/network" },
};

export default function MemberNetworkPage() {
  const categories = getAllCategories();
  return (
    <>
      <section className="mx-auto max-w-7xl px-6 lg:px-8 pt-f89 pb-f21">
        <p className="text-overline text-cambridge mb-f8">Network View</p>
        <h1 className="text-h1">Chamber member network</h1>
        <p className="text-body-lg text-text-secondary mt-f13 max-w-2xl">
          Every chamber member as a node, connected to their industries. Click
          a node to open that business&apos;s profile.
        </p>
        <Link
          href="/membership/directory"
          className="
            mt-f21 inline-flex items-center gap-f8
            text-caption text-text-tertiary hover:text-accent
            focus-visible:outline-none focus-visible:text-accent focus-visible:ring-2 focus-visible:ring-cambridge/40 focus-visible:rounded
            transition-colors duration-200
          "
        >
          <span aria-hidden="true">←</span> Back to directory
        </Link>
      </section>

      <section className="w-full">
        <MemberGraph members={members} categories={categories} />
      </section>
    </>
  );
}
