"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Heart,
  LayoutDashboard,
  Package,
  Gift,
  Home,
  DollarSign,
  CalendarDays,
  Users,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Impact Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory & Scanner", icon: Package },
  { href: "/kits", label: "Care Kit Builder", icon: Gift },
  { href: "/partners", label: "Pantries & Shelters", icon: Home },
  { href: "/fundraising", label: "Fundraising & Donors", icon: DollarSign },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/volunteers", label: "Volunteers", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-64 shrink-0 border-r-2 border-ink bg-paper-raised flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-5 py-5 border-b-2 border-ink">
        <div className="w-9 h-9 rounded-[12px] bg-brick border-2 border-ink flex items-center justify-center shrink-0">
          <Heart className="w-4 h-4 text-paper-raised" fill="currentColor" />
        </div>
        <div className="leading-tight">
          <p className="font-display text-sm text-ink">Hearts Out</p>
          <p className="font-display text-sm text-ink -mt-0.5">for Homeless</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                active
                  ? "bg-sage-soft text-sage-dark border-sage font-bold"
                  : "text-ink-soft border-transparent hover:bg-paper hover:text-ink"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t-2 border-ink">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-ink-soft hover:bg-paper hover:text-ink w-full transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
