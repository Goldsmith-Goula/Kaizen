
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useAppData } from '@/hooks/use-app-data';
import { FutureSelf, FutureSelfCategory } from '@/lib/data-schema';
import { BookOpen, Brain, Flame, Wallet, Users, Briefcase, HeartPulse, Edit, Save, Loader2, Sparkles, UserCheck, UserCog } from 'lucide-react';

type CategoryKey = keyof Omit<FutureSelfCategory, 'skills' | 'habits' | 'financial'>; // Keys for simple text fields
type ComplexCategory = 'skills' | 'habits' | 'financial';

interface CategoryConfig {
    label: string;
    icon: React.ReactNode;
    description: string;
    fields?: CategoryKey[]; // Simple text fields for this category
    complexType?: ComplexCategory; // Type for complex rendering
}

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
    values: { label: "Values", icon: <BookOpen className="h-5 w-5" />, description: "Core principles guiding your life.", fields: ['values'] },
    skills: { label: "Skills", icon: <Brain className="h-5 w-5" />, description: "Abilities you want to develop.", complexType: 'skills' },
    habits: { label: "Habits", icon: <Flame className="h-5 w-5" />, description: "Routines you want to build or break.", complexType: 'habits' },
    finance: { label: "Finance", icon: <Wallet className="h-5 w-5" />, description: "Financial situation and goals.", complexType: 'financial' },
    relationships: { label: "Relationships", icon: <Users className="h-5 w-5" />, description: "Connections with others.", fields: ['relationships'] },
    career: { label: "Career", icon: <Briefcase className="h-5 w-5" />, description: "Professional life and aspirations.", fields: ['career'] },
    health: { label: "Health", icon: <HeartPulse className="h-5 w-5" />, description: "Physical and mental well-being.", fields: ['health'] },
};

export default function FutureSelfPage() {
    const { isInitialized, futureSelf, updateFutureSelf } = useAppData();
    const [currentData, setCurrentData] = useState<FutureSelfCategory>({});
    const [desiredData, setDesiredData] = useState<FutureSelfCategory>({});
    const [isEditing, setIsEditing] = useState<'current' | 'desired' | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<string>(Object.keys(CATEGORY_CONFIG)[0]); // Default to first category

    useEffect(() => {
        if (isInitialized && futureSelf) {
            setCurrentData(futureSelf.current || {});
            setDesiredData(futureSelf.desired || {});
        }
    }, [isInitialized, futureSelf]);

    const handleEditToggle = (type: 'current' | 'desired') => {
        setIsEditing(prev => prev === type ? null : type);
    };

    const handleInputChange = (
        type: 'current' | 'desired',
        category: string, // This is the top-level category key (e.g., 'values', 'finance')
        field: string, // This can be a direct field (e.g., 'values') or a sub-field (e.g., 'incomeGoal')
        value: string | number | { name: string; progress: number }[] | string[] // Allow complex types
    ) => {
        const setData = type === 'current' ? setCurrentData : setDesiredData;
        setData(prev => {
            const categoryConfig = CATEGORY_CONFIG[category];
            if (!categoryConfig) return prev; // Should not happen

            const updatedCategoryData = { ...(prev[category as keyof FutureSelfCategory] || {}) };

            if (categoryConfig.fields?.includes(field as CategoryKey)) {
                 // Simple text field update
                 updatedCategoryData[field as keyof typeof updatedCategoryData] = value as string;
            } else if (categoryConfig.complexType === 'financial') {
                 // Financial sub-field update
                 updatedCategoryData.financial = {
                    ...(updatedCategoryData.financial || {}),
                    [field]: typeof value === 'string' ? parseFloat(value) || 0 : value // Handle parsing
                 };
            }
            // Add logic for 'skills' and 'habits' if needed here


            return {
                ...prev,
                [category as keyof FutureSelfCategory]: updatedCategoryData
            };
        });
    };

     // Specific handlers for complex types (Skills, Habits, Finance) - Simplified for now

    const handleSave = async (type: 'current' | 'desired') => {
        setIsSaving(true);
        const dataToSave = type === 'current' ? currentData : desiredData;
        try {
            await updateFutureSelf({ [type]: dataToSave });
            setIsEditing(null); // Exit editing mode after saving
        } catch (error) {
            console.error("Failed to save Future Self data:", error);
            // Show error toast
        } finally {
            setIsSaving(false);
        }
    };

    const renderCategoryContent = (type: 'current' | 'desired', categoryKey: string) => {
        const data = type === 'current' ? currentData : desiredData;
        const config = CATEGORY_CONFIG[categoryKey];
        const categoryData = data[categoryKey as keyof FutureSelfCategory] || {};
        const editingThis = isEditing === type;

        if (!config) return null;

        // Render Simple Text Fields
        if (config.fields) {
            return config.fields.map(field => (
                <div key={field} className="space-y-2">
                    <Label htmlFor={`${type}-${categoryKey}-${field}`}>{config.label}</Label>
                    {editingThis ? (
                        <Textarea
                            id={`${type}-${categoryKey}-${field}`}
                            value={categoryData[field as keyof typeof categoryData] as string || ''}
                            onChange={(e) => handleInputChange(type, categoryKey, field, e.target.value)}
                            rows={5}
                            placeholder={`Describe your ${type} ${config.label.toLowerCase()}...`}
                        />
                    ) : (
                        <p className="text-sm whitespace-pre-wrap min-h-[5rem] p-2 bg-muted rounded">
                            {categoryData[field as keyof typeof categoryData] as string || `No ${type} ${config.label.toLowerCase()} defined yet.`}
                        </p>
                    )}
                </div>
            ));
        }

        // Render Complex Fields
        if (config.complexType === 'skills') {
            // TODO: Implement Skills rendering/editing (e.g., list with progress bars)
             return <p className="text-sm text-muted-foreground">Skills editing not yet implemented.</p>;
        }
        if (config.complexType === 'habits') {
            // TODO: Implement Habits rendering/editing (e.g., checklist linked to main habits)
             return <p className="text-sm text-muted-foreground">Habits linking not yet implemented.</p>;
        }
        if (config.complexType === 'financial') {
            const financialData = categoryData.financial || {};
            return (
                <div className="space-y-3">
                     <div className="grid grid-cols-3 items-center gap-3">
                        <Label htmlFor={`${type}-finance-incomeGoal`} className="col-span-1 text-sm">Income Goal:</Label>
                         {editingThis ? (
                             <Input
                                id={`${type}-finance-incomeGoal`}
                                type="number"
                                min="0"
                                step="100"
                                value={financialData.incomeGoal || ''}
                                onChange={(e) => handleInputChange(type, categoryKey, 'incomeGoal', e.target.value)}
                                className="col-span-2"
                                placeholder="e.g., 100000"
                             />
                         ) : (
                            <span className="col-span-2 text-sm font-medium">{financialData.incomeGoal ? `$${financialData.incomeGoal.toLocaleString()}` : 'Not set'}</span>
                        )}
                     </div>
                     <div className="grid grid-cols-3 items-center gap-3">
                         <Label htmlFor={`${type}-finance-savingsGoal`} className="col-span-1 text-sm">Savings Goal:</Label>
                         {editingThis ? (
                            <Input
                                id={`${type}-finance-savingsGoal`}
                                type="number"
                                min="0"
                                step="100"
                                value={financialData.savingsGoal || ''}
                                onChange={(e) => handleInputChange(type, categoryKey, 'savingsGoal', e.target.value)}
                                className="col-span-2"
                                placeholder="e.g., 50000"
                            />
                         ) : (
                             <span className="col-span-2 text-sm font-medium">{financialData.savingsGoal ? `$${financialData.savingsGoal.toLocaleString()}` : 'Not set'}</span>
                         )}
                    </div>
                     <div className="grid grid-cols-3 items-center gap-3">
                        <Label htmlFor={`${type}-finance-netWorthGoal`} className="col-span-1 text-sm">Net Worth Goal:</Label>
                         {editingThis ? (
                             <Input
                                id={`${type}-finance-netWorthGoal`}
                                type="number"
                                min="0"
                                step="1000"
                                value={financialData.netWorthGoal || ''}
                                onChange={(e) => handleInputChange(type, categoryKey, 'netWorthGoal', e.target.value)}
                                className="col-span-2"
                                placeholder="e.g., 1000000"
                             />
                        ) : (
                            <span className="col-span-2 text-sm font-medium">{financialData.netWorthGoal ? `$${financialData.netWorthGoal.toLocaleString()}` : 'Not set'}</span>
                         )}
                     </div>
                </div>
            );
        }

        return null; // Should not reach here
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
                    <CardTitle className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary"/> Future Self Builder</CardTitle>
                    <CardDescription>Define who you are now and who you aspire to become across different life areas.</CardDescription>
                </CardHeader>
            </Card>

             <Tabs value={activeTab} onValueChange={setActiveTab}>
                 <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 mb-4 h-auto flex-wrap">
                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                        <TabsTrigger key={key} value={key} className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 px-1 text-xs sm:text-sm h-full">
                            {config.icon} {config.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                    <TabsContent key={key} value={key}>
                         <div className="grid md:grid-cols-2 gap-6">
                             {/* Current Self Card */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                     <CardTitle className="text-lg font-semibold flex items-center gap-2"><UserCog className="h-5 w-5"/> Current Self: {config.label}</CardTitle>
                                    <Button variant={isEditing === 'current' ? "default" : "outline"} size="sm" onClick={() => handleEditToggle('current')} disabled={isSaving && isEditing !== 'current'}>
                                         {isEditing === 'current' ? (
                                            isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>
                                         ) : <Edit className="mr-2 h-4 w-4"/>}
                                         {isEditing === 'current' ? (isSaving ? 'Saving...' : 'Save') : 'Edit'}
                                     </Button>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-sm text-muted-foreground">{config.description}</p>
                                    {renderCategoryContent('current', key)}
                                </CardContent>
                            </Card>

                             {/* Desired Self Card */}
                             <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2"><UserCheck className="h-5 w-5"/> Desired Self: {config.label}</CardTitle>
                                    <Button variant={isEditing === 'desired' ? "default" : "outline"} size="sm" onClick={() => handleEditToggle('desired')} disabled={isSaving && isEditing !== 'desired'}>
                                        {isEditing === 'desired' ? (
                                            isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4"/>
                                        ) : <Edit className="mr-2 h-4 w-4"/>}
                                        {isEditing === 'desired' ? (isSaving ? 'Saving...' : 'Save') : 'Edit'}
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <p className="text-sm text-muted-foreground">{config.description}</p>
                                    {renderCategoryContent('desired', key)}
                                </CardContent>
                            </Card>
                         </div>
                    </TabsContent>
                ))}
             </Tabs>
        </div>
    );
}
