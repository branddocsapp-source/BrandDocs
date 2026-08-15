import { Button } from "@/components/ui/button";
import { BellDotIcon, MenuIcon } from "lucide-react";

export default function Header() {
    return (
        <header className="px-2 py-3 flex justify-between items-center gap-4">
            <div>
                <Button variant={"ghost"} size={"icon"}>
                    <MenuIcon />
                </Button>
            </div>

            <div>
                <div className="text-2xl font-bold tracking-tighter leading-none">
                    Brand<span className="text-orange-500">Docs</span>
                </div>
            </div>

            <div>
                <Button variant={"ghost"} size={"icon"}>
                    <BellDotIcon />
                </Button>
            </div>
        </header>
    )
}