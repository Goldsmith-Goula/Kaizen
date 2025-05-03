
"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppData } from '@/hooks/use-app-data';
import { Upload, Download, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export default function DataManagementPage() {
  const { isInitialized, exportData, importData } = useAppData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [importError, setImportError] = useState<string | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);


  const handleExportClick = () => {
    if (isInitialized) {
      exportData();
    }
  };

  const handleImportClick = () => {
    // Trigger hidden file input
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
       setPendingFile(file);
       setShowOverwriteConfirm(true);
       // Reset file input value so the same file can be selected again if needed
       if (fileInputRef.current) {
           fileInputRef.current.value = '';
       }
    }
  };

  const confirmImport = () => {
      if (!pendingFile || !isInitialized) return;

      setShowOverwriteConfirm(false); // Close confirmation dialog
      setImportStatus('importing');
      setImportError(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target?.result;
        if (typeof text === 'string') {
          try {
            await importData(text);
            setImportStatus('success');
          } catch (error) {
            console.error("Import failed:", error);
            setImportError(error instanceof Error ? error.message : "An unknown error occurred during import.");
            setImportStatus('error');
          }
        } else {
           setImportError("Failed to read file content.");
           setImportStatus('error');
        }
      };
      reader.onerror = () => {
         setImportError("Error reading the selected file.");
         setImportStatus('error');
      };
      reader.readAsText(pendingFile);
      setPendingFile(null); // Clear pending file after starting import
  };

  const cancelImport = () => {
      setShowOverwriteConfirm(false);
      setPendingFile(null);
  };


  return (
    <div className="space-y-6">
       <Card>
         <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Backup your KaizenFlow data or restore from a previous backup.</CardDescription>
        </CardHeader>
         <CardContent className="space-y-6">
            {/* Export Section */}
             <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2"><Download/> Export Data</CardTitle>
                    <Button onClick={handleExportClick} disabled={!isInitialized}>Export to JSON</Button>
                 </CardHeader>
                <CardContent>
                     <p className="text-sm text-muted-foreground">Download all your tasks, habits, goals, and settings into a JSON file. Keep this file safe as a backup.</p>
                </CardContent>
             </Card>

            {/* Import Section */}
             <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                     <CardTitle className="text-lg font-semibold flex items-center gap-2"><Upload/> Import Data</CardTitle>
                    <Button variant="outline" onClick={handleImportClick} disabled={!isInitialized || importStatus === 'importing'}>
                        {importStatus === 'importing' ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                        Choose JSON File...
                    </Button>
                     <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelected}
                        accept=".json"
                        className="hidden"
                    />
                </CardHeader>
                 <CardContent className="space-y-4">
                     <p className="text-sm text-muted-foreground">Restore your data from a previously exported JSON backup file. <strong className="text-destructive">Warning: Importing will overwrite all current data in the application.</strong></p>

                    {importStatus === 'importing' && (
                         <Alert variant="default">
                            <Loader2 className="h-4 w-4 animate-spin" />
                             <AlertTitle>Importing Data</AlertTitle>
                             <AlertDescription>Please wait while your data is being imported...</AlertDescription>
                        </Alert>
                    )}
                     {importStatus === 'success' && (
                        <Alert variant="default" className="border-green-500 dark:border-green-700">
                             <CheckCircle className="h-4 w-4 text-green-500" />
                             <AlertTitle className="text-green-600 dark:text-green-400">Import Successful</AlertTitle>
                             <AlertDescription>Your data has been successfully restored. You may need to refresh the page to see all changes.</AlertDescription>
                         </Alert>
                    )}
                    {importStatus === 'error' && importError && (
                        <Alert variant="destructive">
                             <AlertTriangle className="h-4 w-4" />
                             <AlertTitle>Import Failed</AlertTitle>
                             <AlertDescription>{importError}</AlertDescription>
                         </Alert>
                    )}
                 </CardContent>
            </Card>

         </CardContent>
       </Card>

        {/* Overwrite Confirmation Dialog */}
         <AlertDialog open={showOverwriteConfirm} onOpenChange={setShowOverwriteConfirm}>
            <AlertDialogContent>
                 <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Data Import</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are about to import data from the file: <span className="font-medium">{pendingFile?.name}</span>.
                         <br />
                         <strong className="text-destructive">This action will permanently overwrite all existing data in KaizenFlow.</strong> Are you sure you want to proceed?
                     </AlertDialogDescription>
                 </AlertDialogHeader>
                <AlertDialogFooter>
                     <AlertDialogCancel onClick={cancelImport}>Cancel</AlertDialogCancel>
                     <AlertDialogAction onClick={confirmImport} className="bg-destructive hover:bg-destructive/90">Overwrite and Import</AlertDialogAction>
                </AlertDialogFooter>
             </AlertDialogContent>
         </AlertDialog>

    </div>
  );
}
