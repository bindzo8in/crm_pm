"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect } from "react";
import { Check } from "lucide-react";

const stages = [
  { number: 1, label: "Details", path: "edit" },
  { number: 2, label: "Pricing", path: "builder" },
  { number: 3, label: "Document", path: "composer" },
  { number: 4, label: "Review & send", path: "preview" },
] as const;

interface ProposalWorkflowNavProps {
  proposalId?: string;
  activeStep: 1 | 2 | 3 | 4;
  title?: string | null;
  customerName?: string | null;
  status?: string | null;
  maxAvailableStep: 1 | 2 | 3 | 4;
}

export function ProposalWorkflowNav({
  proposalId,
  activeStep,
  title,
  customerName,
  status,
  maxAvailableStep,
}: ProposalWorkflowNavProps) {
  const canEdit = status === "DRAFT";
  const pathname = usePathname();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <section className="w-full border-b pb-3 sm:pb-5">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2 sm:mb-5 sm:gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-2xl">
            {title || "New proposal"}
          </h1>
          <p className="truncate text-xs text-muted-foreground sm:mt-1 sm:text-sm">
            {customerName || "Add a customer to get started"}
          </p>
        </div>
        {status && (
          <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground sm:px-3 sm:py-1 sm:text-xs">
            {status.replaceAll("_", " ")}
          </span>
        )}
      </div>

      <nav aria-label="Proposal progress">
        <div className="space-y-1.5 sm:hidden">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted-foreground">Step {activeStep} of {stages.length}</span>
            <span aria-current="step" className="font-medium">{stages[activeStep - 1].label}</span>
          </div>
          <div className="flex gap-1" aria-hidden="true">
            {stages.map((stage) => (
              <span
                key={stage.number}
                className={`h-1 flex-1 rounded-full ${
                  stage.number <= activeStep ? "bg-primary" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
        <ol className="hidden min-w-[560px] sm:flex">
          {stages.map((stage) => {
            const isCurrent = stage.number === activeStep;
            const isComplete = stage.number < activeStep && stage.number <= maxAvailableStep;
            const isAvailable = Boolean(proposalId) && canEdit && stage.number <= maxAvailableStep;
            const href = stage.number === 1
              ? `/dashboard/proposals/${proposalId}/edit`
              : `/dashboard/proposals/${proposalId}/${stage.path}`;
            const className = [
              "flex min-h-11 flex-1 items-center gap-2 border-b-2 px-2 pb-3 text-left text-sm transition-colors",
              isCurrent
                ? "border-primary font-semibold text-foreground"
                : isComplete
                  ? "border-primary/50 text-foreground"
                  : "border-border text-muted-foreground",
              isAvailable && !isCurrent ? "hover:text-foreground" : "",
            ].join(" ");

            return (
              <li key={stage.number} className="flex flex-1">
                {isAvailable && !isCurrent ? (
                  <Link href={href} className={className} aria-label={`Go to ${stage.label}`}>
                    <StepMarker number={stage.number} complete={isComplete} />
                    <span className="whitespace-nowrap">{stage.label}</span>
                  </Link>
                ) : (
                  <div
                    className={className}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-disabled={!isCurrent || !isAvailable}
                    title={!isAvailable ? "Complete the previous step to continue." : undefined}
                  >
                    <StepMarker number={stage.number} complete={isComplete} />
                    <span className="whitespace-nowrap">{stage.label}</span>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </section>
  );
}

function StepMarker({ number, complete }: { number: number; complete: boolean }) {
  return (
    <span
      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs ${
        complete
          ? "bg-primary text-primary-foreground"
          : "border border-current"
      }`}
    >
      {complete ? <Check aria-hidden="true" className="size-3.5" /> : number}
    </span>
  );
}
