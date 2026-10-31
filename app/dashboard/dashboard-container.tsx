import { SiteHeader } from "@/components/site-header";
import type { ReactNode } from "react";

export default function DashboardContainer({ children, title, action, back, flush = false, hideHeaderOnMobile = false }: { children: ReactNode, title: string, action?: { href: string, label: string, icon: ReactNode }, back?: { href: string, label?: string }, flush?: boolean, hideHeaderOnMobile?: boolean }) {
    return (
        <>
            <SiteHeader title={title} action={action} back={back} hideOnMobile={hideHeaderOnMobile} />
            <div className="flex min-w-0 flex-1 flex-col">
                <div className={`@container/main mx-auto flex min-w-0 w-full flex-1 flex-col ${flush ? "max-w-none" : "max-w-[1760px]"}`}>
                    <div className={`flex min-w-0 flex-col ${flush ? "gap-0 px-0 pt-0 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0" : "gap-5 px-3 pt-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:gap-6 sm:px-5 sm:pt-6 md:pb-6 lg:px-6"}`}>
                        {children}
                    </div>
                </div>
            </div>
        </>
    )
}