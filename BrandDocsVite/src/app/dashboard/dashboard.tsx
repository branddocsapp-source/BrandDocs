import Header from "@/components/custom/dashboard/header";
import Tabs from "@/components/custom/dashboard/tabs";
import { Outlet } from "react-router";

export default function Dashboard() {
    return (
        <main>
            <Header />  
            <section className="pb-24">
                <Outlet />
            </section>
            <Tabs />
        </main>
    )
}