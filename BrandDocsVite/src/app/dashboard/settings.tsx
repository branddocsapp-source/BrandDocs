import { BellIcon, BuildingIcon, ChevronRightIcon, LogOutIcon, ReceiptIcon, ShieldIcon, UserIcon } from "lucide-react";

function SettingsList() {
    return (
        <div className="grid gap-3">
            <SettingsCard title="Profile Settings" desc="Update your personal details" icon={<UserIcon className="size-6 stroke-blue-500" />} bg="bg-blue-100" />
            <SettingsCard title="Business Details" desc="Update business name, address, logo" icon={<BuildingIcon className="size-6 stroke-orange-500" />} bg="bg-orange-100" />
            <SettingsCard title="Tax & Invoice" desc="Manage GST, prefixes, terms" icon={<ReceiptIcon className="size-6 stroke-green-500" />} bg="bg-green-100" />
            <SettingsCard title="Notifications" desc="Manage alerts and emails" icon={<BellIcon className="size-6 stroke-purple-500" />} bg="bg-purple-100" />
            <SettingsCard title="Security" desc="Change password, 2FA" icon={<ShieldIcon className="size-6 stroke-slate-500" />} bg="bg-slate-100" />
        </div>
    )
}

function SettingsCard({ title, desc, icon, bg }: { title: string, desc: string, icon: React.ReactNode, bg: string }) {
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
                <ChevronRightIcon className="size-5 text-muted-foreground" />
            </div>
        </button>
    )
}

export default function Settings() {
    return (
        <main>
            <section className="px-4 pt-4 pb-2 space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your application preferences</p>
            </section>

            <section className="px-4 py-4">
                <SettingsList />
            </section>

            <section className="px-4 pb-6 mt-4">
                <button className="w-full rounded-xl border border-red-100 bg-red-50 p-4 flex items-center justify-center gap-2 text-red-600 hover:bg-red-100 transition-colors">
                    <LogOutIcon className="size-5 stroke-red-600" />
                    <span className="font-semibold">Log Out</span>
                </button>
            </section>
        </main>
    )
}
