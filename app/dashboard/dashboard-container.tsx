import { SiteHeader } from "@/components/site-header";
import type { ReactNode } from "react";

export default function DashboardContainer({ children, title, action }: { children: ReactNode, title: string, action?: { href: string, label: string, icon: ReactNode } }) {
    return (
        <>
            <SiteHeader title={title} action={action} />
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="@container/main mx-auto flex w-full max-w-[1760px] flex-1 flex-col">
                    <div className="flex min-w-0 flex-col gap-5 py-5 sm:gap-6 sm:py-6">
                        {children}
                    </div>
                </div>
            </div>
        </>
    )
}