 /* ==========================================================================*/
// sidebar.tsx — Main application sidebar component
/* ==========================================================================*/
// Purpose: Renders the main app sidebar with header, content, and footer sections
// Sections: Imports, Component, Exports

"use client";

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import * as React from "react";

// Local Modules ---
import { Sidebar, SidebarContent, SidebarHeader, SidebarRail } from "@/components/ui/sidebar";
import { NavigationActions } from "./actions";

// DB Schema ---
import { User } from "@/db/schema";
import { MainNavigation } from "./main-navigation";

/* ==========================================================================*/
// Interface
/* ==========================================================================*/

interface NavigationSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user: User;
}

/* ==========================================================================*/
// Component
/* ==========================================================================*/

/**
 * AppSidebar
 *
 * Main application sidebar with collapsible icon behavior.
 * Includes header, content, and footer sections.
 *
 * @param props - Sidebar component props including collapsible options
 */
function NavigationSidebar({ user, ...props }: NavigationSidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <NavigationActions user={user} />
      </SidebarHeader>
      <SidebarContent>
        <MainNavigation />
      </SidebarContent>
      {/* <SidebarFooter>
        <div>This is the footer</div>
      </SidebarFooter> */}
      <SidebarRail />
    </Sidebar>
  );
}

/* ==========================================================================*/
// Public Component Exports
/* ==========================================================================*/
export { NavigationSidebar };
