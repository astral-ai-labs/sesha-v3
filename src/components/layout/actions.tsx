"use client";

/* ==========================================================================*/
// Imports
/* ==========================================================================*/

// React core ---
import * as React from "react";

// Lucide Icons ---
import { ChevronsUpDown, LogOut, Copy, Check } from "lucide-react";

// Shadcn UI ---
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";

// Supabase ---
import { User } from "@/db/schema";


// Actions ---
import { logout } from "@/actions/auth";

/* ==========================================================================*/
// Props Interface
/* ==========================================================================*/

interface NavigationActionsProps {
  user: User;
}

/* ==========================================================================*/
// Component
/* ==========================================================================*/

export function NavigationActions({ user }: NavigationActionsProps) {
  const { isMobile } = useSidebar();
  const [isCopied, setIsCopied] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const handleCopyInviteLink = async (event: React.MouseEvent) => {
    // Prevent the dropdown from closing immediately
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
      const inviteUrl = `${baseUrl}/register?orgId=${user.orgId}`;
      await navigator.clipboard.writeText(inviteUrl);
      
      setIsCopied(true);
      
      // Close dropdown after showing "Copied!" for 1 second
      setTimeout(() => {
        setIsDropdownOpen(false);
        // Reset copied state after dropdown closes
        setTimeout(() => {
          setIsCopied(false);
        }, 200);
      }, 1000);
    } catch (error) {
      console.error('Failed to copy invite link:', error);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild className="cursor-pointer">
            <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <div className="bg-blue-500 text-white flex aspect-square size-8 items-center justify-center rounded-lg">
                {/* <Command className="size-4" /> */}
                S
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.firstName || user.lastName ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Sesha Systems"}</span>
                <span className="truncate text-xs">{user.role}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg" align="start" side={isMobile ? "bottom" : "bottom"} sideOffset={4}>
            {user.role === 'admin' && (
              <DropdownMenuItem className="gap-2 p-2 cursor-pointer" onClick={handleCopyInviteLink}>
                <div className={`flex size-6 items-center justify-center rounded-md border bg-transparent transition-all duration-200 ${isCopied ? 'bg-green-100 border-green-300' : ''}`}>
                  {isCopied ? (
                    <Check className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </div>
                <div className={`font-medium transition-all duration-200 ${isCopied ? 'text-green-600' : 'text-muted-foreground'}`}>
                  {isCopied ? 'Copied!' : 'Copy Invite Link'}
                </div>
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="gap-2 p-2" onClick={() => logout()}>
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <LogOut className="size-4" />
              </div>
              <div className="text-muted-foreground font-medium" >Logout</div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
