
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, Bell, Database, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  // This page can act as a hub or redirect to the first settings sub-page.
  // For simplicity, we'll show links to the sub-pages.

  const settingsSections = [
    { href: "/settings/customize", label: "Customize", icon: SlidersHorizontal, description: "Personalize themes and dashboard layout." },
    { href: "/settings/notifications", label: "Notifications", icon: Bell, description: "Manage app notification preferences." },
    { href: "/settings/data", label: "Data Management", icon: Database, description: "Export or import your application data." },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Settings</CardTitle>
          <CardDescription>Manage your application preferences and data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsSections.map((section) => (
            <Link href={section.href} key={section.href} passHref legacyBehavior>
              <a className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors">
                <div className="flex items-center gap-4">
                  <section.icon className="h-6 w-6 text-primary" />
                  <div>
                    <p className="font-semibold">{section.label}</p>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </a>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
