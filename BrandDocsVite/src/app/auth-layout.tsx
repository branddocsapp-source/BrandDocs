import { Outlet } from "react-router";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#fdfaf6] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-[400px]">
        <Outlet />
      </div>
    </div>
  );
}
