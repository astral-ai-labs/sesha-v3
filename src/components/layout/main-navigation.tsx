"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Newspaper,
  Library,
  Layers
} from "lucide-react";
import Link from "next/link";

import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

// ==========================================================================
// Props Interface
// ==========================================================================

// ==========================================================================
// Component
// ==========================================================================

export function MainNavigation() {
  const pathname = usePathname();

  const items = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Digest",
      url: "/digest",
      icon: Newspaper,
    },
    {
      title: "Aggregator",
      url: "/aggregator",
      icon: Layers,
    },
    {
      title: "Library",
      url: "/library",
      icon: Library,
    },
  ];

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => {
          const isActive = pathname === item.url || pathname.startsWith(item.url + "/");

          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                <Link href={item.url}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
