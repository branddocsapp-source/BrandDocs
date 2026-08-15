import { FilesIcon, FileTextIcon, LayoutDashboardIcon, SettingsIcon, UsersIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router";

export default function Tabs() {
    const navigate = useNavigate();
    const location = useLocation();

    const tabs = [
        {
            name: "Dashboard",
            path: "/dashboard",
            icon: LayoutDashboardIcon
        },
        {
            name: "Documents",
            path: "/dashboard/documents",
            icon: FileTextIcon
        },
        {
            name: "Customers",
            path: "/dashboard/customers",
            icon: UsersIcon
        },
        {
            name: "Reports",
            path: "/dashboard/reports",
            icon: FilesIcon
        },
        {
            name: "Settings",
            path: "/dashboard/settings",
            icon: SettingsIcon
        }
    ];

    return (
        <main className="fixed z-50 bottom-0 w-full px-2 pb-3 grid justify-center bg-linear-to-t from-background via-background/70">
            <div className="p-1 rounded-full bg-background border flex gap-0 items-center">
                {tabs.map((tab) => {
                    const isActive = tab.path === "/dashboard" 
                        ? location.pathname === "/dashboard" || location.pathname === "/dashboard/"
                        : location.pathname.startsWith(tab.path);

                    return (
                        <button 
                            key={tab.path}
                            onClick={() => navigate(tab.path)}
                            className={`py-3 w-14 grid gap-1 rounded-full transition-colors ${isActive ? 'bg-orange-50 text-orange-500' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <tab.icon className="size-5 mx-auto" />
                            {/* <div className="text-[8px] font-bold tracking-tighter leading-none">
                                {tab.name}
                            </div> */}
                        </button>
                    )
                })}
            </div>
        </main>
    )
}