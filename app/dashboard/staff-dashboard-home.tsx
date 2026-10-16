import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  FileText,
  Info,
  LockKeyhole,
  ReceiptText,
  UserRound,
  UsersRound,
  Wallet,
} from "lucide-react";

import DashboardContainer from "@/app/dashboard/dashboard-container";

const staffDestinations = [
  {
    title: "Attendance",
    description: "Clock in, review your attendance, and manage regularization requests.",
    href: "/attendance",
    icon: Clock3,
    featured: true,
  },
  {
    title: "Leave management",
    description: "Request leave and check the status of your requests.",
    href: "/dashboard/leaves",
    icon: CalendarDays,
  },
  {
    title: "Company holidays",
    description: "View the company-wide holiday calendar.",
    href: "/dashboard/holidays",
    icon: CalendarDays,
  },
  {
    title: "Proposals",
    description: "Create and review customer proposals.",
    href: "/dashboard/proposals",
    icon: FileText,
  },
  {
    title: "Customers",
    description: "Find customers and keep their details up to date.",
    href: "/dashboard/customers",
    icon: UsersRound,
  },
  {
    title: "Invoices",
    description: "View invoices and follow up on billing.",
    href: "/dashboard/invoices",
    icon: ReceiptText,
  },
  {
    title: "My salary",
    description: "Review your salary slips and payment history.",
    href: "/dashboard/salary",
    icon: Wallet,
  },
  {
    title: "My account",
    description: "Update your profile and account settings.",
    href: "/dashboard/account",
    icon: UserRound,
  },
];

export function StaffDashboardHome({
  firstName,
  greeting,
  hasDepartment,
  canViewSalary,
}: {
  firstName: string;
  greeting: string;
  hasDepartment: boolean;
  canViewSalary: boolean;
}) {
  return (
    <DashboardContainer title="My Workspace">
      <main className="w-full space-y-6 px-4 pb-8 md:px-6">
        <header className="space-y-2">
          <p className="text-sm text-muted-foreground">Your work, all in one place</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {greeting}, {firstName}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Choose where you want to go. Your attendance, leave, and holiday tools are ready when you need them.
          </p>
        </header>

        {!hasDepartment && (
          <aside
            role="status"
            className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm"
          >
            <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400" />
            <p className="text-muted-foreground">
              Your workspace is being set up. Please ask your administrator or HR manager to assign you to a department. These tools will be available once your access is ready.
            </p>
          </aside>
        )}

        <section aria-label="Staff workspace shortcuts" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {staffDestinations
            .filter(({ href }) => href !== "/dashboard/salary" || canViewSalary)
            .map(({ title, description, href, icon: Icon, featured }) => {
            const cardClassName = `group flex min-h-36 flex-col justify-between rounded-xl border p-5 ${
              hasDepartment
                ? `outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${
                    featured
                      ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90 sm:col-span-2 xl:col-span-1"
                      : "border-border bg-card hover:bg-muted/50"
                  }`
                : "cursor-not-allowed border-border bg-muted/40 text-muted-foreground opacity-65"
            }`;
            const cardContent = (
              <>
                <div className="flex items-start justify-between gap-4">
                  <span className={`grid size-11 place-items-center rounded-lg ${
                    hasDepartment && featured ? "bg-primary-foreground/15" : "bg-primary/10 text-primary"
                  }`}>
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  {hasDepartment ? (
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 opacity-60 transition-transform group-hover:translate-x-1 group-focus-visible:translate-x-1"
                    />
                  ) : (
                    <LockKeyhole aria-hidden="true" className="size-4 opacity-60" />
                  )}
                </div>
                <div className="mt-5">
                  <h2 className="font-semibold">{title}</h2>
                  <p className={`mt-1 text-sm ${
                    hasDepartment && featured ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}>
                    {description}
                  </p>
                </div>
              </>
            );

            return hasDepartment ? (
              <Link key={title} href={href} className={cardClassName}>
                {cardContent}
              </Link>
            ) : (
              <div key={title} aria-disabled="true" className={cardClassName}>
                {cardContent}
              </div>
            );
            })}
        </section>
      </main>
    </DashboardContainer>
  );
}
