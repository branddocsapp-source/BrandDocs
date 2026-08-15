import { Route, Routes } from "react-router";
import Overview from "./overview";
import Dashboard from "./dashboard";
import Documents from "./documents";
import Customers from "./customers";
import Reports from "./reports";
import Settings from "./settings";

export default function DashboardRoutes() {
    return (
        <Routes>
            <Route element={<Dashboard />}>
                <Route index element={<Overview />} />
                <Route path="documents" element={<Documents />} />
                <Route path="customers" element={<Customers />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
            </Route>
        </Routes>
    )
}