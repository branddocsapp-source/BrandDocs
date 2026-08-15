import { DropdownMenu, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Building2, ChevronDownIcon, FileCheckIcon, FilePlusIcon, FileTextIcon, IdCardIcon, ScanQrCodeIcon } from "lucide-react"

function ProfileSwitcher() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger className={"flex-1 w-full"}>
                <div className="p-3 rounded-lg border flex gap-2 items-center bg-orange-50/50">
                    <div>
                        <Building2 className="size-6" />
                    </div>
                    <div className="space-y-0.5 pl-2">
                        <div className="text-sm font-semibold text-left tracking-tight leading-none">
                            Sunrise Enterprises
                        </div>
                        <div className="text-xs text-orange-600 font-medium text-left tracking-tight leading-none">
                            View Profile
                        </div>
                    </div>

                    <ChevronDownIcon className="ml-auto size-5" />
                </div>
            </DropdownMenuTrigger>
        </DropdownMenu>
    )
}


function Metrics() {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
            <div className="rounded-lg border p-2 flex gap-2 items-center">
                <div className="w-14 h-14 rounded-md bg-blue-100 grid place-content-center">
                    <FileTextIcon className="size-8 stroke-blue-500" />
                </div>

                <div className="space-y-1">
                    <div className="text-xs font-semibold tracking-tight leading-none"> 
                        Invoices
                    </div>
                    <div className="text-xl font-semibold tracking-tight leading-none"> 
                        24
                    </div>
                    <div className="text-[9px] font-medium tracking-tight leading-none text-muted-foreground"> 
                        This Month
                    </div>
                </div>
            </div>


            <div className="rounded-lg border p-2 flex gap-2 items-center">
                <div className="w-14 h-14 rounded-md bg-green-100 grid place-content-center">
                    <FileTextIcon className="size-8 stroke-green-500" />
                </div>

                <div className="space-y-1">
                    <div className="text-xs font-semibold tracking-tight leading-none"> 
                        Quotations
                    </div>
                    <div className="text-xl font-semibold tracking-tight leading-none"> 
                        18
                    </div>
                    <div className="text-[9px] font-medium tracking-tight leading-none text-muted-foreground"> 
                        This Month
                    </div>
                </div>
            </div>

            <div className="rounded-lg border p-2 flex gap-2 items-center">
                <div className="w-14 h-14 rounded-md bg-teal-100 grid place-content-center">
                    <FileCheckIcon className="size-8 stroke-teal-500" />
                </div>

                <div className="space-y-1">
                    <div className="text-xs font-semibold tracking-tight leading-none"> 
                        Receipts
                    </div>
                    <div className="text-xl font-semibold tracking-tight leading-none"> 
                        12
                    </div>
                    <div className="text-[9px] font-medium tracking-tight leading-none text-muted-foreground"> 
                        This Month
                    </div>
                </div>
            </div>

            <div className="rounded-lg border p-2 flex gap-2 items-center">
                <div className="w-14 h-14 rounded-md bg-orange-100 grid place-content-center">
                    <ScanQrCodeIcon className="size-8 stroke-orange-500" />
                </div>

                <div className="space-y-1">
                    <div className="text-xs font-semibold tracking-tight leading-none"> 
                        Scan Receipts
                    </div>
                    <div className="text-xl font-semibold tracking-tight leading-none"> 
                        32
                    </div>
                    <div className="text-[9px] font-medium tracking-tight leading-none text-muted-foreground"> 
                        This Month
                    </div>
                </div>
            </div>
        </div>
    )
}


function QuickActions() {
    return (
        <div className="space-y-3">
            <div>
                <div className="text-base ml-1 font-semibold tracking-tighter leading-none">
                    Quick Actions
                </div>
            </div>


            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {["Create Invoice", "Create Quotation", "Create Receipt", "Create Letterhead"].map((action) => 
                    <button key={action} className="rounded-lg px-2 py-3 bg-orange-50 grid gap-2">
                        <div>
                            <FilePlusIcon className="size-6 stroke-orange-500 mx-auto" />
                        </div>
                        <div className="text-xs font-bold tracking-tighter leading-none">
                            {action}
                        </div>
                    </button>
                )}
                <button className="rounded-lg px-2 py-3 bg-orange-50 grid gap-2">
                    <div>
                        <IdCardIcon className="size-6 stroke-orange-500 mx-auto" />
                    </div>
                    <div className="text-xs font-bold tracking-tighter leading-none">
                        Create Visiting Card
                    </div>
                </button>
                <button className="rounded-lg px-2 py-3 bg-orange-50 grid gap-2">
                    <div>
                        <ScanQrCodeIcon className="size-6 stroke-orange-500 mx-auto" />
                    </div>
                    <div className="text-xs font-bold tracking-tighter leading-none">
                        Scan Receipt
                    </div>
                </button>
            </div>


        </div>
    )
}



function RecentDocuments() {
    return (
       <div className="space-y-3">
            <div className="flex gap-2 items-center justify-between">
                <div className="text-base ml-1 font-semibold tracking-tighter leading-none">
                    Recent Documents
                </div>
                <div>
                    <div className="text-sm font-medium text-orange-600 pr-1">
                        View All
                    </div>
                </div>
            </div>


            <div className="grid divide-y">
                <button className="px-2 py-2 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md bg-teal-100 grid place-content-center">
                        <FileCheckIcon className="size-6 stroke-teal-500" />
                    </div>

                    <div className="grid gap-1 text-left">
                        <div className="text-sm font-bold leading-none"> 
                            INV-042
                        </div>
                        <div className="text-xs text-muted-foreground leading-none"> 
                            Today
                        </div>
                    </div>

                    <div className="text-sm font-bold text-teal-600 ml-auto"> 
                        Rs. 1,440.00
                    </div>
                </button>

                
                <button className="px-2 py-2 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-md bg-red-100 grid place-content-center">
                        <ScanQrCodeIcon className="size-6 stroke-red-500" />
                    </div>

                    <div className="grid gap-1 text-left">
                        <div className="text-sm font-bold leading-none"> 
                            SCN-142
                        </div>
                        <div className="text-xs text-muted-foreground leading-none"> 
                            Yesterday
                        </div>
                    </div>

                    <div className="text-sm font-bold text-red-600 ml-auto"> 
                        Rs. 140.00
                    </div>
                </button>
            </div>


        </div> 
    )
}


export default function Overview() {
    return (
        <main>
            <section className="px-4 py-2">
                <ProfileSwitcher />
            </section>
            <section className="px-4 py-2">
                <Metrics />
            </section>
            <section className="px-4 py-3">
                <QuickActions />
            </section>
            <section className="px-4 py-3">
                <RecentDocuments />
            </section>
        </main>
    )
}