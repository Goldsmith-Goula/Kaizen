
"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  CheckSquare,
  BarChart3,
  Trophy,
  Target,
  Wallet,
  BookOpen,
  Brain,
  Settings2,
  LogOut,
  Flame, // Icon for Habits/Streaks
  Users, // Icon for Relationships
  Briefcase, // Icon for Career
  HeartPulse, // Icon for Health
  FileText, // Icon for Journal
  SlidersHorizontal, // Icon for Customization
  Sparkles, // Icon for Future Self
  BarChartBig, // Icon for Reporting
  Bell,
  Database,
} from "lucide-react";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Mock user data (Consider moving to context or props if needed globally)
// const user = {
//   name: "Kaizen User",
//   email: "user@kaizenflow.app",
// };

export default function AppSidebar() {
   const pathname = usePathname(); // Get current path

  // Define root path for future-self to handle active state correctly
  const futureSelfRootPath = "/future-self";
  const settingsRootPath = "/settings";

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tasks", label: "Tasks", icon: CheckSquare },
    { href: "/habits", label: "Habits", icon: Flame },
    { href: "/progress", label: "Progress", icon: BarChart3 },
    { href: "/milestones", label: "Milestones", icon: Trophy },
    { href: "/journal", label: "Journal", icon: FileText },
    { href: "/finance", label: "Finance", icon: Wallet },
    { href: futureSelfRootPath, label: "Future Self", icon: Sparkles, subItems: [
        // Sub-items should likely navigate to sections within the /future-self page or dedicated sub-pages if complex
        // For now, assume they are part of the main /future-self page or link to the main page.
        // Adjust hrefs if dedicated pages like /future-self/values are created.
        { href: futureSelfRootPath, /* or #values */ label: "Values", icon: BookOpen },
        { href: futureSelfRootPath, /* or #skills */ label: "Skills", icon: Brain },
        // { href: futureSelfRootPath, /* or #habits */ label: "Habits", icon: Flame }, // Duplicate? Habits have their own main nav
        { href: futureSelfRootPath, /* or #finance */ label: "Finance", icon: Wallet },
        { href: futureSelfRootPath, /* or #relationships */ label: "Relationships", icon: Users },
        { href: futureSelfRootPath, /* or #career */ label: "Career", icon: Briefcase },
        { href: futureSelfRootPath, /* or #health */ label: "Health", icon: HeartPulse },
    ]},
    { href: "/reports", label: "Reports", icon: BarChartBig },
    { href: settingsRootPath, label: "Settings", icon: Settings2, subItems: [
        { href: "/settings/customize", label: "Customize", icon: SlidersHorizontal },
        { href: "/settings/notifications", label: "Notifications", icon: Bell },
        { href: "/settings/data", label: "Data", icon: Database },
    ]},
  ];

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      <SidebarHeader className="flex items-center gap-2">
         {/* Desktop Sidebar Trigger - visible only on desktop */}
         <div className="hidden md:block">
           <SidebarTrigger />
         </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-accent group-data-[state=collapsed]:hidden"
          aria-hidden="true"
        >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.77 5.82 22 7 14.14 2 9.27l6.91-1.01L12 2z"/>
            <path d="M12 8v10"/>
            <path d="M16 12H8"/>
        </svg>
        <span className="text-lg font-semibold group-data-[state=collapsed]:hidden">KaizenFlow</span>
      </SidebarHeader>
      <SidebarContent className="flex-1 overflow-auto">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref legacyBehavior>
                 <SidebarMenuButton
                    asChild
                    // Check if the current pathname starts with the item's href, or exactly matches
                    isActive={pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/')) || (item.subItems && pathname.startsWith(item.href))}
                    tooltip={item.label}
                 >
               <span className={`group-data-[state=expanded]:inline ${pathname === '/' ? 'hidden sm:inline' : 'inline'}`}>{item.label}</span>
                 </SidebarMenuButton>
              </Link>
              {/* Render sub-items if they exist */}
              {item.subItems && (
                 <SidebarMenuSub>
                   {item.subItems.map((subItem) => (
                     <SidebarMenuSubItem key={`${item.href}-${subItem.label}`}> {/* Use a combination for unique key */}
                       <Link href={subItem.href} passHref legacyBehavior>
                          <SidebarMenuSubButton
                             asChild
                             // Exact match for sub-items unless it's the root, then check start
                             isActive={pathname === subItem.href}
                          >
                             <a>
                                <subItem.icon className="h-4 w-4 mr-2"/>
                                {subItem.label}
                             </a>
                          </SidebarMenuSubButton>
                       </Link>
                     </SidebarMenuSubItem>
                   ))}
                 </SidebarMenuSub>
              )}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
           <SidebarMenuItem>
                {/* Placeholder for logout functionality */}
               <SidebarMenuButton tooltip="Log Out">
                   <LogOut className="h-4 w-4" />
                   <span className="group-data-[state=expanded]:inline hidden">Log Out</span>
               </SidebarMenuButton>
           </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
