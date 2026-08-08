import { ChevronRightIcon, FileCheckIcon, FileTextIcon, IdCardIcon, LightbulbIcon, ScanQrCodeIcon } from "lucide-react";

export default function Documents() {
    return (
        <main>
            <section className="px-4 pt-4 pb-2 space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
                <p className="text-sm text-muted-foreground">Create and manage all your business documents</p>
            </section>

            <section className="px-4 py-4 grid gap-3">
                <DocumentCard 
                    icon={<FileTextIcon className="size-6 stroke-blue-500" />}
                    iconBg="bg-blue-100"
                    title="Invoices"
                    description="Create and manage invoices"
                />
                <DocumentCard 
                    icon={<FileTextIcon className="size-6 stroke-green-500" />}
                    iconBg="bg-green-100"
                    title="Quotations"
                    description="Create and manage quotations"
                />
                <DocumentCard 
                    icon={<FileCheckIcon className="size-6 stroke-teal-500" />}
                    iconBg="bg-teal-100"
                    title="Receipts"
                    description="Create and manage receipts"
                />
                <DocumentCard 
                    icon={<FileTextIcon className="size-6 stroke-purple-500" />}
                    iconBg="bg-purple-100"
                    title="Letterheads"
                    description="Create and manage letterheads"
                />
                <DocumentCard 
                    icon={<IdCardIcon className="size-6 stroke-pink-500" />}
                    iconBg="bg-pink-100"
                    title="Visiting Cards"
                    description="Create and manage visiting cards"
                />
                <DocumentCard 
                    icon={<ScanQrCodeIcon className="size-6 stroke-orange-500" />}
                    iconBg="bg-orange-100"
                    title="Scan Receipt"
                    description="Scan and save receipt documents"
                />
            </section>

            <section className="px-4 pb-6">
                <div className="rounded-xl border bg-orange-50/50 p-4 flex gap-4 mt-2">
                    <div>
                        <LightbulbIcon className="size-6 stroke-orange-500" />
                    </div>
                    <div className="text-sm font-medium text-orange-900 leading-tight">
                        <span className="font-bold">Tip:</span> Keep all your business documents in one place. Create, manage and share with ease!
                    </div>
                </div>
            </section>
        </main>
    )
}

function DocumentCard({ icon, iconBg, title, description }: { icon: React.ReactNode, iconBg: string, title: string, description: string }) {
    return (
        <button className="rounded-xl border p-3 flex gap-4 items-center bg-card text-left transition-colors hover:bg-muted/50">
            <div className={`w-12 h-12 rounded-lg grid place-content-center ${iconBg}`}>
                {icon}
            </div>
            <div className="flex-1 space-y-0.5">
                <div className="text-base font-semibold tracking-tight leading-none">
                    {title}
                </div>
                <div className="text-xs text-muted-foreground">
                    {description}
                </div>
            </div>
            <div>
                <ChevronRightIcon className="size-5 text-muted-foreground" />
            </div>
        </button>
    )
}
