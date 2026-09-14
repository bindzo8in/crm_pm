"use client";

import dynamic from "next/dynamic";

export const ProposalPdfRenderer = dynamic(
  () => import("./ProposalPdfRenderer").then((mod) => mod.ProposalPdfRenderer),
  { ssr: false }
);
