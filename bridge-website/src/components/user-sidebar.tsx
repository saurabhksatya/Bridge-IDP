"use client";

import * as React from "react";
import { Gauge, History, Plus } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { authClient } from "@/server/better-auth/client";
import { Skeleton } from "./ui/skeleton";
import { NavUser } from "./sidebar-user-icon";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();
  const router = useRouter();
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <Image
              src={"/bridge.svg"}
              alt="Bridge Logo"
              width={32}
              height={32}
            />
          </div>

          <div className="grid flex-1 text-left text-lg leading-tight">
            <span className="truncate font-medium">Bridge Watch</span>
          </div>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="cursor-pointer"
                onClick={() => {
                  router.push("/dashboard");
                }}
                isActive={pathname === "/dashboard"}
              >
                <Gauge />
                <span className="font-medium">Dashboard</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="cursor-pointer"
                onClick={() => {
                  router.push("/history");
                }}
                isActive={pathname.startsWith("/history")}
              >
                <History />
                <span className="font-medium">History</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                className="cursor-pointer"
                onClick={() => {
                  router.push("/add");
                }}
                isActive={pathname.startsWith("/add")}
              >
                <Plus />
                <span className="font-medium">Add Bridge</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        {isPending ? (
          <div className="flex items-center gap-2 p-2">
            <Skeleton className="size-8 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ) : session?.user ? (
          <NavUser
            user={{ name: session.user.name, email: session.user.email }}
          />
        ) : (
          <div className="flex items-center gap-2 p-2">
            <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-full text-sm font-medium"></div>
            <div>
              <p className="text-sm font-medium">Current User</p>
              <p className="text-muted-foreground text-xs">user@example.com</p>
            </div>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
