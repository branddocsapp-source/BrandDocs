import { Route, Routes } from "react-router"
import Home from "./app/home"
import DashboardRoutes from "./app/dashboard/routes"
import AuthLayout from "./app/auth-layout"
import Login from "./app/login"
import Register from "./app/register"

export function App() {
  return (
    <Routes>
      <Route index element={<Home />} />
      <Route path="dashboard/*" element={<DashboardRoutes />} />

      <Route element={<AuthLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
      </Route>

      {/* <Route path="concerts">
        <Route index element={<ConcertsHome />} />
        <Route path=":city" element={<City />} />
        <Route path="trending" element={<Trending />} />
      </Route> */}
    </Routes>
  )
}

export default App
