
"use client";

import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input'; // For tags
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Edit, Trash2, Smile, Frown, Meh, Angry, PartyPopper, Search, Loader2, BookOpen, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { format, parseISO, compareDesc } from 'date-fns';
import { cn } from '@/lib/utils';
import { JournalEntry, Mood } from '@/lib/data-schema';
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group" // For mood selection


const MOOD_OPTIONS: { value: Mood; icon: React.ReactNode; label: string }[] = [
  { value: "😊", icon: <Smile className="h-5 w-5" />, label: "Happy" },
  { value: "😐", icon: <Meh className="h-5 w-5" />, label: "Neutral" },
  { value: "😢", icon: <Frown className="h-5 w-5" />, label: "Sad" },
  { value: "😠", icon: <Angry className="h-5 w-5" />, label: "Angry" },
  { value: "🎉", icon: <PartyPopper className="h-5 w-5" />, label: "Excited/Celebrate" },
];

const getMoodIcon = (moodValue?: Mood): React.ReactNode => {
  return MOOD_OPTIONS.find(m => m.value === moodValue)?.icon;
}

export default function JournalPage() {
  const { isInitialized, journalEntries, updateJournalEntry, deleteJournalEntry } = useAppData();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMood, setFilterMood] = useState<Mood | 'all'>('all');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 'desc' = newest first

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);

  const [modalFormData, setModalFormData] = useState<Partial<JournalEntry>>({ content: '', tags: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);


  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    if (!isInitialized) return [];

    let filtered = [...journalEntries];

    // Filter by search term (content, tags)
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.content.toLowerCase().includes(lowerSearchTerm) ||
        (entry.tags && entry.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm)))
      );
    }

    // Filter by mood
    if (filterMood !== 'all') {
      filtered = filtered.filter(entry => entry.mood === filterMood);
    }

    // Sort by timestamp
    filtered.sort((a, b) => {
      return sortOrder === 'desc'
        ? compareDesc(parseISO(a.timestamp), parseISO(b.timestamp))
        : compareDesc(parseISO(b.timestamp), parseISO(a.timestamp));
    });

    return filtered;
  }, [journalEntries, searchTerm, filterMood, sortOrder, isInitialized]);


  // --- Modal Handling ---
  useEffect(() => {
    if (editingEntry) {
      setModalFormData({
        ...editingEntry,
        tags: editingEntry.tags || [], // Ensure tags is an array
      });
      setIsAddModalOpen(true);
    } else {
      // Reset for new entry
      setModalFormData({ content: '', mood: undefined, tags: [] });
    }
  }, [editingEntry]);

  const handleOpenAddModal = () => {
    setEditingEntry(null);
    setModalFormData({ content: '', mood: undefined, tags: [] });
    setIsAddModalOpen(true);
  };

  const handleModalInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const { name, value } = e.target;
     if (name === 'tags') {
         // Split by comma and trim whitespace
         const tagsArray = value.split(',').map(tag => tag.trim()).filter(tag => tag !== '');
         setModalFormData(prev => ({ ...prev, tags: tagsArray }));
     } else {
        setModalFormData(prev => ({ ...prev, [name]: value }));
     }
  };

   const handleMoodChange = (value: Mood | undefined) => {
        setModalFormData(prev => ({ ...prev, mood: value }));
   }

   const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalFormData.content?.trim()) {
      alert("Journal entry content cannot be empty."); // Replace with toaster
      return;
    }

    setIsSubmitting(true);
    try {
      await updateJournalEntry({
        id: editingEntry?.id, // Pass ID if editing
        timestamp: editingEntry?.timestamp || new Date().toISOString(), // Keep original timestamp or set new one
        content: modalFormData.content || '',
        mood: modalFormData.mood,
        tags: modalFormData.tags || [],
      });
      setIsAddModalOpen(false);
      setEditingEntry(null);
      setModalFormData({ content: '', tags: [] }); // Reset form
    } catch (error) {
      console.error("Failed to save journal entry:", error);
      // Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

   const handleConfirmDelete = () => {
    if (entryToDelete) {
      deleteJournalEntry(entryToDelete.id);
      setEntryToDelete(null); // Close confirmation dialog
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
                <CardTitle className="text-2xl font-bold">Progress Journal</CardTitle>
                <Button onClick={handleOpenAddModal}>
                    <Plus className="mr-2 h-4 w-4" /> New Entry
                </Button>
            </CardHeader>
             <CardContent>
                 {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                    <div className="relative md:flex-1">
                         <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Search entries or tags..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 w-full"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {/* Mood Filter */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full md:w-auto">
                                    <Filter className="mr-2 h-4 w-4" />
                                    {filterMood === 'all' ? 'All Moods' : (getMoodIcon(filterMood) || 'Filter Mood')}
                                    {filterMood !== 'all' && (
                                        <X className="ml-2 h-4 w-4" onClick={(e) => {e.stopPropagation(); setFilterMood('all');}}/>
                                    )}
                                </Button>
                             </PopoverTrigger>
                            <PopoverContent className="w-auto p-1">
                                 <ToggleGroup
                                    type="single"
                                    value={filterMood}
                                    onValueChange={(value : Mood | 'all') => setFilterMood(value || 'all')}
                                    className="flex flex-wrap justify-center"
                                >
                                     <ToggleGroupItem value="all" aria-label="All Moods" className={cn(filterMood === 'all' && "bg-accent")}>All</ToggleGroupItem>
                                    {MOOD_OPTIONS.map(mood => (
                                        <ToggleGroupItem key={mood.value} value={mood.value} aria-label={mood.label} className={cn(filterMood === mood.value && "bg-accent")}>
                                            {mood.icon}
                                        </ToggleGroupItem>
                                    ))}
                                </ToggleGroup>
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

                {/* Journal Entries List */}
                 <div className="space-y-4">
                    {filteredEntries.length > 0 ? (
                        filteredEntries.map(entry => (
                             <Card key={entry.id} className="transition-shadow hover:shadow-md">
                                <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2 pt-4 px-4">
                                    <div>
                                         <CardDescription className="text-sm text-muted-foreground flex items-center gap-2">
                                             {getMoodIcon(entry.mood)}
                                            {format(parseISO(entry.timestamp), 'PPP p')} {/* Date and Time */}
                                         </CardDescription>
                                         {entry.tags && entry.tags.length > 0 && (
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {entry.tags.map(tag => (
                                                    <span key={tag} className="bg-secondary px-2 py-0.5 rounded text-xs text-secondary-foreground">{tag}</span>
                                                ))}
                                            </div>
                                         )}
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingEntry(entry)}>
                                            <Edit size={16} />
                                             <span className="sr-only">Edit Entry</span>
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setEntryToDelete(entry)}>
                                            <Trash2 size={16} />
                                            <span className="sr-only">Delete Entry</span>
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="px-4 pb-4 pt-2">
                                     {/* Use whitespace-pre-wrap to preserve line breaks */}
                                     <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                                </CardContent>
                             </Card>
                        ))
                    ) : (
                         <div className="text-center py-10 text-muted-foreground">
                            <BookOpen className="mx-auto h-12 w-12 mb-4 opacity-50" />
                            <p>Your journal is empty, or no entries match your filters.</p>
                            <p>Start reflecting on your progress!</p>
                             <Button className="mt-4" onClick={handleOpenAddModal}>
                                <Plus className="mr-2 h-4 w-4" /> Write Your First Entry
                            </Button>
                        </div>
                    )}
                </div>
             </CardContent>
        </Card>

        {/* Add/Edit Journal Entry Modal */}
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
             <DialogContent className="sm:max-w-[525px]">
                 <form onSubmit={handleModalSubmit}>
                    <DialogHeader>
                        <DialogTitle>{editingEntry ? 'Edit Journal Entry' : 'New Journal Entry'}</DialogTitle>
                        <DialogDescription>
                             {editingEntry ? 'Update your thoughts or reflections.' : 'Record your thoughts, feelings, and insights.'}
                         </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                         <div className="space-y-2">
                            <Label htmlFor="content">Reflection*</Label>
                            <Textarea
                                id="content"
                                name="content"
                                value={modalFormData.content || ''}
                                onChange={handleModalInputChange}
                                className="min-h-[150px]" // Make textarea larger
                                placeholder="What's on your mind? How did today go?"
                                required
                            />
                        </div>
                         <div className="space-y-2">
                             <Label>Mood (Optional)</Label>
                             <ToggleGroup
                                type="single"
                                value={modalFormData.mood}
                                onValueChange={(value: Mood | '') => handleMoodChange(value || undefined)} // Allow unsetting
                                className="flex flex-wrap justify-start gap-2"
                             >
                                {MOOD_OPTIONS.map(mood => (
                                    <ToggleGroupItem key={mood.value} value={mood.value} aria-label={mood.label} className="h-10 w-10 p-0 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">
                                        {mood.icon}
                                    </ToggleGroupItem>
                                ))}
                             </ToggleGroup>
                         </div>
                        <div className="space-y-2">
                            <Label htmlFor="tags">Tags (Optional, comma-separated)</Label>
                            <Input
                                id="tags"
                                name="tags"
                                value={modalFormData.tags?.join(', ') || ''} // Join tags for display/editing
                                onChange={handleModalInputChange}
                                placeholder="e.g., productivity, challenge, success"
                            />
                        </div>
                         {editingEntry && (
                             <p className="text-xs text-muted-foreground">
                                Entry Date: {format(parseISO(editingEntry.timestamp), 'PPP p')}
                             </p>
                         )}
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                             <Button type="button" variant="secondary" onClick={() => { setIsAddModalOpen(false); setEditingEntry(null); }}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            {editingEntry ? 'Save Changes' : 'Add Entry'}
                         </Button>
                    </DialogFooter>
                 </form>
             </DialogContent>
        </Dialog>


         {/* Delete Confirmation Dialog */}
         <Dialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
             <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Deletion</DialogTitle>
                     <DialogDescription>
                        Are you sure you want to delete this journal entry from {entryToDelete ? format(parseISO(entryToDelete.timestamp), 'PPP') : ''}? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="secondary" onClick={() => setEntryToDelete(null)}>Cancel</Button>
                     <Button variant="destructive" onClick={handleConfirmDelete}>Delete Entry</Button>
                </DialogFooter>
             </DialogContent>
        </Dialog>

    </div>
  );
}
