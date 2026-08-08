import { ChevronRightIcon, LightbulbIcon, MailIcon, PhoneIcon, UserPlusIcon, UsersIcon } from "lucide-react";

function CustomerActions() {
    return (
        <div className="grid grid-cols-2 gap-2">
            <button className="rounded-lg px-2 py-3 bg-orange-50 flex items-center justify-center gap-2">
                <UserPlusIcon className="size-5 stroke-orange-500" />
                <span className="text-xs font-bold tracking-tighter leading-none text-orange-900">Add Customer</span>
            </button>
            <button className="rounded-lg px-2 py-3 bg-orange-50 flex items-center justify-center gap-2">
                <UsersIcon className="size-5 stroke-orange-500" />
                <span className="text-xs font-bold tracking-tighter leading-none text-orange-900">Import Contacts</span>
            </button>
        </div>
    )
}

function CustomerList() {
    return (
        <div className="grid gap-3">
            <CustomerCard name="Acme Corp" phone="+1 234 567 890" email="contact@acme.com" />
            <CustomerCard name="Globex Inc" phone="+1 987 654 321" email="info@globex.com" />
            <CustomerCard name="Soylent Corp" phone="+1 555 123 456" email="hello@soylent.com" />
            <CustomerCard name="Initech" phone="+1 555 987 654" email="support@initech.com" />
        </div>
    )
}

function CustomerCard({ name, phone, email }: { name: string, phone: string, email: string }) {
    return (
        <button className="rounded-xl border p-3 flex gap-4 items-center bg-card text-left transition-colors hover:bg-muted/50">
            <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 grid place-content-center text-lg font-bold">
                {name.charAt(0)}
            </div>
            <div className="flex-1 space-y-1">
                <div className="text-base font-semibold tracking-tight leading-none">
                    {name}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1"><PhoneIcon className="size-3" /> {phone}</div>
                    <div className="flex items-center gap-1"><MailIcon className="size-3" /> {email}</div>
                </div>
            </div>
            <div>
                <ChevronRightIcon className="size-5 text-muted-foreground" />
            </div>
        </button>
    )
}

export default function Customers() {
    return (
        <main>
            <section className="px-4 pt-4 pb-2 space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
                <p className="text-sm text-muted-foreground">Manage your clients and customers</p>
            </section>

            <section className="px-4 py-3">
                <CustomerActions />
            </section>

            <section className="px-4 py-2">
                <div className="text-base font-semibold tracking-tighter leading-none mb-3">
                    Recent Customers
                </div>
                <CustomerList />
            </section>

            <section className="px-4 pb-6">
                <div className="rounded-xl border bg-orange-50/50 p-4 flex gap-4 mt-2">
                    <div>
                        <LightbulbIcon className="size-6 stroke-orange-500" />
                    </div>
                    <div className="text-sm font-medium text-orange-900 leading-tight">
                        <span className="font-bold">Tip:</span> Add complete details to create invoices faster!
                    </div>
                </div>
            </section>
        </main>
    )
}
