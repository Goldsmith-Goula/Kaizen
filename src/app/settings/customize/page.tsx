
"use client";

import { useState, useEffect } from 'react';
import { useTheme } from "next-themes";
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useAppData } from '@/hooks/use-app-data';
import { AppSettings } from '@/lib/data-schema';
import { Sun, Moon, Laptop, Loader2 } from 'lucide-react';

export default function CustomizeSettingsPage() {
  const { isInitialized, settings, updateSettings } = useAppData();
  const { setTheme, theme: currentNextTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<AppSettings['theme']>('system');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isInitialized && settings) {
      setSelectedTheme(settings.theme || 'system');
      // Ensure next-themes is synced with stored setting
      if(settings.theme !== currentNextTheme) {
        setTheme(settings.theme || 'system');
      }
    }
  }, [isInitialized, settings, setTheme, currentNextTheme]);

  const handleThemeChange = (value: AppSettings['theme']) => {
     if(!value) return; // Should not happen with RadioGroup
     setSelectedTheme(value);
     setTheme(value); // Update theme immediately via next-themes
     // Save to local storage via useAppData
     setIsSaving(true);
     try {
         updateSettings({ theme: value });
     } catch (error) {
         console.error("Failed to save theme setting:", error);
         // Add toast notification for error
     } finally {
         // Optional: Add a slight delay or visual confirmation
         setTimeout(() => setIsSaving(false), 500);
     }
  };

   if (!isInitialized) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Customize Appearance</CardTitle>
          <CardDescription>Personalize the look and feel of Kaizen.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Theme</Label>
            <RadioGroup
              value={selectedTheme}
              onValueChange={handleThemeChange}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              <Label
                htmlFor="theme-light"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
              >
                 <RadioGroupItem value="light" id="theme-light" className="sr-only" />
                <Sun className="mb-3 h-6 w-6" />
                Light
              </Label>
              <Label
                 htmlFor="theme-dark"
                 className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
              >
                 <RadioGroupItem value="dark" id="theme-dark" className="sr-only" />
                <Moon className="mb-3 h-6 w-6" />
                Dark
              </Label>
              <Label
                htmlFor="theme-system"
                className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary"
              >
                 <RadioGroupItem value="system" id="theme-system" className="sr-only" />
                <Laptop className="mb-3 h-6 w-6" />
                System
              </Label>
            </RadioGroup>
             {isSaving && <p className="text-sm text-muted-foreground flex items-center gap-1"><Loader2 className="h-4 w-4 animate-spin"/> Saving theme...</p>}
          </div>

          {/* Future: Dashboard Layout Customization */}
          {/* <Separator />
          <div>
            <h3 className="text-base font-semibold mb-3">Dashboard Layout</h3>
            <p className="text-sm text-muted-foreground">Drag and drop to reorder dashboard widgets.</p>
            {/* Placeholder for drag-and-drop interface */}
             {/*<div className="mt-4 p-4 border rounded bg-muted min-h-[100px] flex items-center justify-center">
               <p>(Dashboard layout customization coming soon)</p>
             </div>
           </div> */}

          {/* Future: Custom Themes */}
           {/* <Separator />
           <div>
             <h3 className="text-base font-semibold mb-3">Custom Themes</h3>
             <p className="text-sm text-muted-foreground">Create or manage your own color themes.</p>
             {/* Placeholder for theme creator/selector */}
            {/* <div className="mt-4 p-4 border rounded bg-muted min-h-[100px] flex items-center justify-center">
               <p>(Custom theme editor coming soon)</p>
             </div>
           </div> */}

        </CardContent>
      </Card>
    </div>
  );
}
