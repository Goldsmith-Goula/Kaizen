
"use client"

import * as React from "react"
import { createContext, useContext, useState, useCallback, HTMLAttributes, ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority"


// --- Context ---

interface SidebarContextProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  toggleCollapse: () => void;
  openMobileSidebar: () => void;
  closeMobileSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}

// --- Provider ---

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
    // Ensure mobile sidebar is closed when desktop sidebar is toggled
    if (isMobileOpen) setIsMobileOpen(false);
  }, [isMobileOpen]);

  const openMobileSidebar = useCallback(() => {
    setIsMobileOpen(true);
  }, []);

  const closeMobileSidebar = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  return (
    <SidebarContext.Provider value={{ isCollapsed, isMobileOpen, toggleCollapse, openMobileSidebar, closeMobileSidebar }}>
      <TooltipProvider delayDuration={0}>
        {children}
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

// --- Sidebar Container ---

const sidebarVariants = cva(
  "fixed inset-y-0 z-50 flex h-full flex-col border-r bg-background transition-all duration-300 ease-in-out",
  {
    variants: {
      variant: {
        sidebar: "border-r",
        sheet: "border-l", // Example variant if needed
      },
      side: {
        left: "left-0",
        right: "right-0",
      },
      collapsible: {
        icon: "data-[state=collapsed]:w-14 data-[state=expanded]:w-64",
        none: "w-64", // Or whatever fixed width is desired
      },
    },
    defaultVariants: {
      variant: "sidebar",
      side: "left",
      collapsible: "icon",
    },
  }
);

export interface SidebarProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof sidebarVariants> {
    collapsible?: "icon" | "none";
    side?: "left" | "right";
    variant?: "sidebar" | "sheet"; // Added variant prop
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, collapsible = "icon", side = "left", variant = "sidebar", ...props }, ref) => {
    const { isCollapsed, isMobileOpen, closeMobileSidebar } = useSidebar();
    const state = isCollapsed ? "collapsed" : "expanded";
    const isIconCollapsible = collapsible === "icon";

    return (
      <>
        {/* Desktop Sidebar */}
        <div
          ref={ref}
          className={cn(
             sidebarVariants({ variant, side, collapsible }),
            "hidden md:flex", // Hide on mobile by default
            isIconCollapsible && "group", // Add group class for data attributes
            className
          )}
          data-state={isIconCollapsible ? state : undefined}
          {...props}
        />

        {/* Mobile Sidebar Overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 md:hidden"
            onClick={closeMobileSidebar}
            aria-hidden="true"
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={cn(
            sidebarVariants({ variant, side, collapsible: "none" }), // Always expanded width on mobile
            "md:hidden", // Hide on desktop
            isMobileOpen ? "translate-x-0" : "-translate-x-full", // Slide in/out
            className
          )}
          data-state="expanded" // Always expanded on mobile visually
          {...props}
        />
      </>
    );
  }
);
Sidebar.displayName = "Sidebar";


// --- Sidebar Header ---

const SidebarHeader = React.forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex h-14 items-center border-b px-4 shrink-0 group", className)}
      {...props}
    />
  )
);
SidebarHeader.displayName = "SidebarHeader";

// --- Sidebar Content ---

const SidebarContent = React.forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex-1 overflow-y-auto overflow-x-hidden p-2 group", className)}
      {...props}
    />
  )
);
SidebarContent.displayName = "SidebarContent";

// --- Sidebar Footer ---

const SidebarFooter = React.forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("mt-auto border-t p-2 shrink-0 group", className)}
      {...props}
    />
  )
);
SidebarFooter.displayName = "SidebarFooter";

// --- Sidebar Trigger ---

const SidebarTrigger = React.forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
    ({ className, children, ...props }, ref) => {
      const { isCollapsed, toggleCollapse, isMobileOpen, openMobileSidebar, closeMobileSidebar } = useSidebar();

      const handleToggle = () => {
          if (window.innerWidth < 768) { // Assuming md breakpoint is 768px
            if (isMobileOpen) {
              closeMobileSidebar();
            } else {
              openMobileSidebar();
            }
          } else {
            toggleCollapse();
          }
      }

      return (
          <Button
            ref={ref}
            variant="ghost"
            size="icon"
            className={cn("rounded-full", className)}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={handleToggle}
            {...props}
          >
             {children ?? <ChevronRight className={cn("h-5 w-5 transition-transform duration-300", !isCollapsed && "rotate-180")} />}
          </Button>
      );
    }
);
SidebarTrigger.displayName = "SidebarTrigger";


// --- Sidebar Inset (Main Content Area) ---

const SidebarInset = React.forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const { isCollapsed } = useSidebar();
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col flex-1 transition-all duration-300 ease-in-out md:pl-14", // Default padding for collapsed icon sidebar
          !isCollapsed && "md:pl-64", // Padding for expanded sidebar
          className
        )}
        {...props}
      />
    );
  }
);
SidebarInset.displayName = "SidebarInset";


// --- Menu Components ---

const SidebarMenu = React.forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(
  ({ className, ...props }, ref) => (
    <ul
      ref={ref}
      className={cn("space-y-1", className)}
      {...props}
    />
  )
);
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = React.forwardRef<HTMLLIElement, HTMLAttributes<HTMLLIElement>>(
    ({ className, ...props }, ref) => (
        <li ref={ref} className={cn("", className)} {...props} /> // Basic list item
    )
);
SidebarMenuItem.displayName = "SidebarMenuItem";


interface SidebarMenuButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  asChild?: boolean;
  tooltip?: React.ReactNode;
}

const SidebarMenuButton = React.forwardRef<HTMLButtonElement, SidebarMenuButtonProps>(
  ({ className, children, isActive, asChild, tooltip, ...props }, ref) => {
    const { isCollapsed } = useSidebar();
    const Comp = asChild ? Slot : "button";
    const buttonContent = (
      <Comp
        ref={ref}
        className={cn(
          buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "default" }),
          "w-full justify-start",
          isCollapsed && "justify-center px-0 h-10 w-10", // Center icon when collapsed
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );

    if (isCollapsed && tooltip) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
          <TooltipContent side="right">{tooltip}</TooltipContent>
        </Tooltip>
      );
    }

    return buttonContent;
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";


const SidebarGroup = React.forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn("mt-4 group", className)} {...props} />
    )
);
SidebarGroup.displayName = "SidebarGroup";


const SidebarGroupLabel = React.forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "px-4 py-2 text-xs font-semibold uppercase text-muted-foreground group-data-[state=collapsed]:hidden",
                className
            )}
            {...props}
        />
    )
);
SidebarGroupLabel.displayName = "SidebarGroupLabel";


// --- Sub Menu Components (Basic Placeholders) ---

const SidebarMenuSub = React.forwardRef<HTMLUListElement, HTMLAttributes<HTMLUListElement>>(
    ({ className, ...props }, ref) => (
        <ul
            ref={ref}
            className={cn("ml-4 border-l pl-4 space-y-1 group-data-[state=collapsed]:hidden", className)}
            {...props}
        />
    )
);
SidebarMenuSub.displayName = "SidebarMenuSub";

const SidebarMenuSubItem = React.forwardRef<HTMLLIElement, HTMLAttributes<HTMLLIElement>>(
    ({ className, ...props }, ref) => (
        <li ref={ref} className={cn("", className)} {...props} />
    )
);
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

interface SidebarMenuSubButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isActive?: boolean;
  asChild?: boolean;
}

const SidebarMenuSubButton = React.forwardRef<HTMLButtonElement, SidebarMenuSubButtonProps>(
  ({ className, children, isActive, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          buttonVariants({ variant: isActive ? "secondary" : "ghost", size: "sm" }), // Smaller size for sub-items
          "w-full justify-start text-sm", // Ensure text size is appropriate
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";


export {
    Sidebar,
    SidebarHeader,
    SidebarContent,
    SidebarFooter,
    SidebarTrigger,
    SidebarInset,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenuSub,
    SidebarMenuSubItem,
    SidebarMenuSubButton,
    sidebarVariants
};

