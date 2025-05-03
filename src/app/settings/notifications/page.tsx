
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useAppData } from '@/hooks/use-app-data';
import { AppSettings } from '@/lib/data-schema';
import { Loader2, BellRing, CheckSquare, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast'; // Import useToast

type NotificationKey = keyof NonNullable<AppSettings['notificationPreferences']>;

export default function NotificationsSettingsPage() {
  const { isInitialized, settings, updateSettings } = useAppData();
  const { toast } = useToast(); // Use the toast hook
  const [preferences, setPreferences] = useState<NonNullable<AppSettings['notificationPreferences']>>({});
  const [isSaving, setIsSaving] = useState<Partial<Record<NotificationKey, boolean>>>({});

  useEffect(() => {
    if (isInitialized && settings?.notificationPreferences) {
      setPreferences(settings.notificationPreferences);
    } else if (isInitialized) {
       // Initialize with defaults if not present
       const defaultPrefs = { taskStart: true, taskEnd: false, milestone: true };
       setPreferences(defaultPrefs);
       updateSettings({ notificationPreferences: defaultPrefs }); // Save defaults immediately
    }
  }, [isInitialized, settings, updateSettings]);


  const handlePreferenceChange = async (key: NotificationKey, checked: boolean) => {
      const updatedPref = { ...preferences, [key]: checked };
      setPreferences(updatedPref); // Optimistic UI update

      setIsSaving(prev => ({ ...prev, [key]: true })); // Set saving state for this key
      try {
        await updateSettings({ notificationPreferences: updatedPref });
         // Show success toast
         toast({
            title: "Settings Saved",
            description: `Notification preference for "${getNotificationLabel(key)}" updated.`,
         });
      } catch (error) {
         console.error(`Failed to save notification setting "${key}":`, error);
          // Revert UI on error
          setPreferences(prev => ({...prev, [key]: !checked }));
          // Show error toast
         toast({
            title: "Error Saving",
            description: `Failed to update notification setting. Please try again.`,
            variant: "destructive",
         });
      } finally {
          // Optional: Add delay before removing saving indicator
          setTimeout(() => setIsSaving(prev => ({ ...prev, [key]: false })), 500);
      }
  };

    // Helper to get user-friendly labels
    const getNotificationLabel = (key: NotificationKey): string => {
        switch (key) {
            case 'taskStart': return 'Task Start Reminders';
            case 'taskEnd': return 'Task Due Reminders';
            case 'milestone': return 'Milestone Achievements';
            default: return key;
        }
    };

    const getNotificationDescription = (key: NotificationKey): string => {
         switch (key) {
            case 'taskStart': return 'Get notified shortly before a scheduled task is due to start.';
            case 'taskEnd': return 'Receive a reminder when a task\'s due date/time is approaching.';
            case 'milestone': return 'Celebrate when you mark a milestone as achieved.';
            default: return '';
        }
    }

     const getNotificationIcon = (key: NotificationKey): React.ReactNode => {
         switch (key) {
            case 'taskStart':
            case 'taskEnd': return <CheckSquare className="h-5 w-5 text-blue-500" />;
            case 'milestone': return <Trophy className="h-5 w-5 text-yellow-500" />;
            default: return <BellRing className="h-5 w-5" />;
        }
     }


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
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Choose which notifications you want to receive. (Note: Actual notification delivery requires browser/system permissions).</CardDescription>
        </CardHeader>
         <CardContent className="space-y-4">
            {(Object.keys(preferences) as NotificationKey[]).map((key) => (
                <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                         <div className="mt-1">{getNotificationIcon(key)}</div>
                         <div>
                            <Label htmlFor={`notification-${key}`} className="font-medium cursor-pointer">
                                {getNotificationLabel(key)}
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                {getNotificationDescription(key)}
                             </p>
                         </div>
                    </div>
                     <div className="flex items-center gap-2">
                         {isSaving[key] && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        <Switch
                            id={`notification-${key}`}
                            checked={preferences[key]}
                            onCheckedChange={(checked) => handlePreferenceChange(key, checked)}
                            disabled={isSaving[key]} // Disable while saving this specific pref
                         />
                    </div>
                 </div>
            ))}
         </CardContent>
       </Card>
    </div>
  );
}
