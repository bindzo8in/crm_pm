import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ProposalStepGateProps {
  title: string;
  description: string;
  href: string;
  action: string;
}

export function ProposalStepGate({ title, description, href, action }: ProposalStepGateProps) {
  return (
    <section role="alert" className="max-w-2xl space-y-3 border-l-2 border-primary/50 py-2 pl-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Button asChild size="sm">
        <Link href={href}>{action}</Link>
      </Button>
    </section>
  );
}
