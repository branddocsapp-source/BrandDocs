import { BarChart3Icon, ChevronRightIcon, FileDownIcon, LightbulbIcon, PieChartIcon, TrendingUpIcon } from "lucide-react";

function ReportMetrics() {
    return (
        <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-3 flex flex-col gap-2">
                <div className="w-8 h-8 rounded-md bg-green-100 grid place-content-center">
                    <TrendingUpIcon className="size-5 stroke-green-600" />
                </div>
                <div>
                    <div className="text-xs text-muted-foreground font-medium">Total Sales</div>
                    <div className="text-xl font-bold">Rs. 45,230</div>
                </div>
            </div>
            <div className="rounded-xl border p-3 flex flex-col gap-2">
                <div className="w-8 h-8 rounded-md bg-orange-100 grid place-content-center">
                    <PieChartIcon className="size-5 stroke-orange-600" />
                </div>
                <div>
                    <div className="text-xs text-muted-foreground font-medium">Pending Due</div>
                    <div className="text-xl font-bold">Rs. 12,500</div>
                </div>
            </div>
        </div>
    )
}

function ReportList() {
    return (
        <div className="grid gap-3">
            <ReportCard title="Sales Report" desc="Monthly sales overview" icon={<TrendingUpIcon className="size-6 stroke-blue-500" />} bg="bg-blue-100" />
            <ReportCard title="Tax Report" desc="GST and tax summaries" icon={<PieChartIcon className="size-6 stroke-purple-500" />} bg="bg-purple-100" />
            <ReportCard title="Expense Report" desc="Monthly expenses overview" icon={<BarChart3Icon className="size-6 stroke-red-500" />} bg="bg-red-100" />
            <ReportCard title="Item Sales" desc="Product wise sales" icon={<BarChart3Icon className="size-6 stroke-teal-500" />} bg="bg-teal-100" />
        </div>
    )
}

function ReportCard({ title, desc, icon, bg }: { title: string, desc: string, icon: React.ReactNode, bg: string }) {
    return (
        <button className="rounded-xl border p-3 flex gap-4 items-center bg-card text-left transition-colors hover:bg-muted/50">
            <div className={`w-12 h-12 rounded-lg ${bg} grid place-content-center`}>
                {icon}
            </div>
            <div className="flex-1 space-y-0.5">
                <div className="text-base font-semibold tracking-tight leading-none">
                    {title}
                </div>
                <div className="text-xs text-muted-foreground">
                    {desc}
                </div>
            </div>
            <div>
                <FileDownIcon className="size-5 text-muted-foreground" />
            </div>
        </button>
    )
}

export default function Reports() {
    return (
        <main>
            <section className="px-4 pt-4 pb-2 space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
                <p className="text-sm text-muted-foreground">View insights and analytics</p>
            </section>

            <section className="px-4 py-3">
                <ReportMetrics />
            </section>

            <section className="px-4 py-2">
                <div className="text-base font-semibold tracking-tighter leading-none mb-3">
                    Available Reports
                </div>
                <ReportList />
            </section>

            <section className="px-4 pb-6">
                <div className="rounded-xl border bg-orange-50/50 p-4 flex gap-4 mt-2">
                    <div>
                        <LightbulbIcon className="size-6 stroke-orange-500" />
                    </div>
                    <div className="text-sm font-medium text-orange-900 leading-tight">
                        <span className="font-bold">Tip:</span> Download your reports as PDF or Excel for easy sharing.
                    </div>
                </div>
            </section>
        </main>
    )
}
