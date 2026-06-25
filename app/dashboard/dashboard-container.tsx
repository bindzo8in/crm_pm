import { SiteHeader } from "@/components/site-header";
import { ReactNode } from "react";

export default async function DashboardContainer({ children, title, action }: { children: ReactNode, title: string, action?: { href: string, label: string, icon: ReactNode } }) {
    return (
        <>
            <SiteHeader title={title} action={action} />
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

                        {children}
                    </div>
                </div>
            </div>
        </>
    )
}