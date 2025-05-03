
import type {Metadata} from 'next';
import {Inter} from 'next/font/google';
import './globals.css';
import {cn} from '@/lib/utils';
import {ThemeProvider} from '@/components/theme-provider';
import {Toaster} from '@/components/ui/toaster';
import {SidebarProvider, SidebarInset} from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar';
import AppHeader from '@/components/app-header';

const inter = Inter({subsets: ['latin'], variable: '--font-sans'});

export const metadata: Metadata = {
  title: 'Kaizen',
  description: 'Personal Development Tracking App',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', inter.variable)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <AppHeader />
              <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
            </SidebarInset>
          </SidebarProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
