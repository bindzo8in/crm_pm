import { SiteHeader } from "@/components/site-header";
import type { ReactNode } from "react";

export default function DashboardContainer({ children, title, action, back }: { children: ReactNode, title: string, action?: { href: string, label: string, icon: ReactNode }, back?: { href: string, label?: string } }) {
    return (
        <>
            <SiteHeader title={title} action={action} back={back} />
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="@container/main mx-auto flex min-w-0 w-full max-w-[1760px] flex-1 flex-col">
                    <div className="flex min-w-0 flex-col gap-5 px-3 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:gap-6 sm:px-5 sm:pt-6 md:pb-6 lg:px-6">
                        {children}
                    </div>
                </div>
            </div>
        </>
    )
}