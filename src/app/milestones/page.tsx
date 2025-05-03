
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Plus, Edit, Trash2, Trophy, CalendarIcon, Filter, X, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { format, parseISO, isValid, compareDesc } from 'date-fns';
import { cn } from '@/lib/utils';
import { Milestone } from '@/lib/data-schema';
import { useAppData } from '@/hooks/use-app-data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';

export default function MilestonesPage() {
  const { isInitialized, milestones, updateMilestone, deleteMilestone } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 'desc' = newest first

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [milestoneToDelete, setMilestoneToDelete] = useState<Milestone | null>(null);

  const [modalFormData, setModalFormData] = useState<Partial<Milestone>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Derive unique categories for filtering
  const categories = useMemo(() => {
    if (!isInitialized) return [];
    const uniqueCategories = new Set<string>();
    milestones.forEach(m => m.category && uniqueCategories.add(m.category));
    return Array.from(uniqueCategories).sort();
  }, [milestones, isInitialized]);


  // Filter and sort milestones
  const filteredMilestones = useMemo(() => {
    if (!isInitialized) return [];

    let filtered = [...milestones];

    // Filter by search term (title, description, category)
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(lowerSearchTerm) ||
        (m.description && m.description.toLowerCase().includes(lowerSearchTerm)) ||
        (m.category && m.category.toLowerCase().includes(lowerSearchTerm))
      );
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(m => m.category === filterCategory);
    }

    // Sort by dateAchieved
    filtered.sort((a, b) => {
        const dateA = parseISO(a.dateAchieved);
        const dateB = parseISO(b.dateAchieved);
        if (!isValid(dateA)) return 1; // Invalid dates last
        if (!isValid(dateB)) return -1;
        return sortOrder === 'desc' ? compareDesc(dateA, dateB) : compareDesc(dateB, dateA);
    });

    return filtered;
  }, [milestones, searchTerm, filterCategory, sortOrder, isInitialized]);


  // --- Modal Handling ---
  useEffect(() => {
    if (editingMilestone) {
      setModalFormData({
        ...editingMilestone,
         // Format date for input type="date" and ensure it's a valid ISO string for Calendar
         dateAchieved: editingMilestone.dateAchieved ? format(parseISO(editingMilestone.dateAchieved), 'yyyy-MM-dd') : undefined,
      });
      setIsAddModalOpen(true);
    } else {
      // Reset for new milestone, default date to today
      setModalFormData({ dateAchieved: format(new Date(), 'yyyy-MM-dd') });
    }
  }, [editingMilestone]);

  const handleOpenAddModal = () => {
    setEditingMilestone(null);
    setModalFormData({ dateAchieved: format(new Date(), 'yyyy-MM-dd') }); // Default date to today
    setIsAddModalOpen(true);
  };

   const handleModalInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setModalFormData(prev => ({ ...prev, [name]: value }));
  };

   const handleModalDateChange = (date: Date | undefined) => {
        setModalFormData(prev => ({
            ...prev,
            // Store as 'yyyy-MM-dd' string for the input, but it will be saved as ISO string
            dateAchieved: date ? format(date, 'yyyy-MM-dd') : undefined
        }));
    };

   const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalFormData.title?.trim() || !modalFormData.dateAchieved) {
      alert("Milestone title and date are required."); // Replace with toaster
      return;
    }

    setIsSubmitting(true);
    try {
        // Ensure dateAchieved is stored as a full ISO string at the start of the day
        const finalDateAchieved = format(parseISO(modalFormData.dateAchieved), "yyyy-MM-dd'T'00:00:00.000'Z'");

      await updateMilestone({
        id: editingMilestone?.id, // Pass ID if editing
        ...modalFormData,
        dateAchieved: finalDateAchieved,
      });
      setIsAddModalOpen(false);
      setEditingMilestone(null);
      setModalFormData({}); // Reset form
    } catch (error) {
      console.error("Failed to save milestone:", error);
      // Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

    const handleConfirmDelete = () => {
    if (milestoneToDelete) {
      deleteMilestone(milestoneToDelete.id);
      setMilestoneToDelete(null); // Close confirmation dialog
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
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Milestones</CardTitle>
          <Button onClick={handleOpenAddModal}>
            <Plus className="mr-2 h-4 w-4" /> Add Milestone
          </Button>
        </CardHeader>
        <CardContent>
           {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Input
              placeholder="Search milestones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:flex-1"
            />
            <div className="flex flex-wrap gap-2">
                 {/* Category Filter */}
                 <Popover>
                    <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        className="w-full md:w-[200px] justify-between"
                    >
                        {filterCategory === 'all'
                        ? "All Categories"
                        : categories.find(cat => cat === filterCategory) ?? "Select Category..."}
                        <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                        <div className="p-1">
                            <Button
                                variant="ghost"
                                className={cn("w-full justify-start", filterCategory === 'all' && "bg-accent")}
                                onClick={() => setFilterCategory('all')}
                            >
                                All Categories
                             </Button>
                            {categories.map((category) => (
                                <Button
                                variant="ghost"
                                key={category}
                                className={cn("w-full justify-start", filterCategory === category && "bg-accent")}
                                onClick={() => setFilterCategory(category)}
                                >
                                {category}
                                </Button>
                            ))}
                         </div>
                    </PopoverContent>
                </Popover>

                {/* Sort Order */}
                <Button
                    variant="outline"
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className="w-full md:w-auto"
                >
                    {sortOrder === 'desc' ? 'Date (Newest First)' : 'Date (Oldest First)'}
                 </Button>
            </div>
          </div>

           {/* Milestone List */}
           <div className="space-y-4">
                {filteredMilestones.length > 0 ? (
                    filteredMilestones.map(milestone => (
                        <Card key={milestone.id} className="transition-shadow hover:shadow-md">
                            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2 pt-4 px-4">
                                <div>
                                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                        <Trophy className="h-5 w-5 text-yellow-500" />
                                        {milestone.title}
                                    </CardTitle>
                                    <CardDescription className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                                         <CalendarIcon className="h-4 w-4" /> {format(parseISO(milestone.dateAchieved), 'PPP')}
                                        {milestone.category && <span className="ml-2 inline-block bg-secondary px-2 py-0.5 rounded text-xs">{milestone.category}</span>}
                                    </CardDescription>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingMilestone(milestone)}>
                                        <Edit size={16} />
                                        <span className="sr-only">Edit Milestone</span>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setMilestoneToDelete(milestone)}>
                                        <Trash2 size={16} />
                                        <span className="sr-only">Delete Milestone</span>
                                    </Button>
                                </div>
                             </CardHeader>
                            {milestone.description && (
                                <CardContent className="px-4 pb-4 pt-2">
                                    <p className="text-sm">{milestone.description}</p>
                                </CardContent>
                            )}
                        </Card>
                    ))
                 ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <Trophy className="mx-auto h-12 w-12 mb-4 opacity-50" />
                        <p>No milestones recorded yet, or none match your filters.</p>
                        <p>Celebrate your achievements by adding them!</p>
                        <Button className="mt-4" onClick={handleOpenAddModal}>
                            <Plus className="mr-2 h-4 w-4" /> Add Your First Milestone
                        </Button>
                    </div>
                 )}
           </div>

        </CardContent>
      </Card>

      {/* Add/Edit Milestone Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogContent className="sm:max-w-[480px]">
                <form onSubmit={handleModalSubmit}>
                    <DialogHeader>
                        <DialogTitle>{editingMilestone ? 'Edit Milestone' : 'Add New Milestone'}</DialogTitle>
                        <DialogDescription>
                            {editingMilestone ? 'Update the details of this achievement.' : 'Record a significant achievement.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">Title*</Label>
                            <Input
                                id="title"
                                name="title"
                                value={modalFormData.title || ''}
                                onChange={handleModalInputChange}
                                className="col-span-3"
                                required
                                maxLength={100}
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="dateAchieved" className="text-right">Date*</Label>
                             <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant={"outline"}
                                        className={cn(
                                            "col-span-3 justify-start text-left font-normal",
                                            !modalFormData.dateAchieved && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {modalFormData.dateAchieved ? format(parseISO(modalFormData.dateAchieved), "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={modalFormData.dateAchieved ? parseISO(modalFormData.dateAchieved) : undefined}
                                        onSelect={handleModalDateChange}
                                        initialFocus
                                        // Disable future dates? Optional.
                                        // disabled={(date) => date > new Date()}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Description</Label>
                            <Textarea
                                id="description"
                                name="description"
                                value={modalFormData.description || ''}
                                onChange={handleModalInputChange}
                                className="col-span-3"
                                placeholder="(Optional) Add details about this milestone..."
                                rows={4}
                            />
                        </div>
                         <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">Category</Label>
                            <Input
                                id="category"
                                name="category"
                                value={modalFormData.category || ''}
                                onChange={handleModalInputChange}
                                className="col-span-3"
                                placeholder="(Optional) e.g., Career, Personal, Health"
                                list="milestone-categories" // Suggest existing categories
                            />
                            <datalist id="milestone-categories">
                                {categories.map(cat => <option key={cat} value={cat} />)}
                            </datalist>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary" onClick={() => { setIsAddModalOpen(false); setEditingMilestone(null); }}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                             {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                             {editingMilestone ? 'Save Changes' : 'Add Milestone'}
                         </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!milestoneToDelete} onOpenChange={(open) => !open && setMilestoneToDelete(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Deletion</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete the milestone "{milestoneToDelete?.title}"? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                     <Button variant="secondary" onClick={() => setMilestoneToDelete(null)}>Cancel</Button>
                     <Button variant="destructive" onClick={handleConfirmDelete}>Delete Milestone</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

    </div>
  );
}
