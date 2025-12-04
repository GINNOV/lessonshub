'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';

type InstructionBooklet = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

interface InstructionBookletManagerProps {
  initialBooklets: InstructionBooklet[];
}

export default function InstructionBookletManager({ initialBooklets }: InstructionBookletManagerProps) {
  const [booklets, setBooklets] = useState<InstructionBooklet[]>(initialBooklets);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingBody, setEditingBody] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error('Title and content are required.');
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch('/api/instruction-booklets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save booklet.');
      }
      const newBooklet: InstructionBooklet = await response.json();
      setBooklets((prev) => [newBooklet, ...prev]);
      setTitle('');
      setBody('');
      toast.success('Instruction booklet saved.');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this instruction booklet?')) return;
    try {
      const response = await fetch(`/api/instruction-booklets/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to delete booklet.');
      }
      setBooklets((prev) => prev.filter((b) => b.id !== id));
      toast.success('Instruction booklet deleted.');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const startEditing = (booklet: InstructionBooklet) => {
    setEditingId(booklet.id);
    setEditingTitle(booklet.title);
    setEditingBody(booklet.body);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle('');
    setEditingBody('');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    if (!editingTitle.trim() || !editingBody.trim()) {
      toast.error('Title and content are required.');
      return;
    }
    try {
      const response = await fetch(`/api/instruction-booklets/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editingTitle, body: editingBody }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update booklet.');
      }
      const updated = await response.json();
      setBooklets((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
      cancelEditing();
      toast.success('Instruction booklet updated.');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Instruction Booklet</CardTitle>
        </CardHeader>
        <form onSubmit={handleCreate}>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-100">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Standard Essay Instructions" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-100">Content</label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                placeholder="Write the full instructions students should follow..."
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Booklet'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <div className="space-y-4">
        {booklets.length === 0 && (
          <p className="text-sm text-gray-500">No instruction booklets saved yet.</p>
        )}
        {booklets.map((booklet) => (
          <Card key={booklet.id}>
            {editingId === booklet.id ? (
              <form onSubmit={handleUpdate}>
                <CardHeader>
                  <CardTitle>Edit Instruction Booklet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-100">Title</label>
                    <Input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-100">Content</label>
                    <Textarea value={editingBody} onChange={(e) => setEditingBody(e.target.value)} rows={8} />
                  </div>
                </CardContent>
                <CardFooter className="flex gap-3">
                  <Button type="submit">Update</Button>
                  <Button type="button" variant="outline" onClick={cancelEditing}>
                    Cancel
                  </Button>
                </CardFooter>
              </form>
            ) : (
              <>
                <CardHeader>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">{booklet.title}</CardTitle>
                      <p className="text-xs text-gray-400">
                        Updated {new Date(booklet.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => startEditing(booklet)}>
                        Edit
                      </Button>
                      <Button type="button" variant="destructive" size="sm" onClick={() => handleDelete(booklet.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="whitespace-pre-wrap rounded-md bg-gray-50 p-4 text-sm text-gray-800">
                    {booklet.body}
                  </pre>
                </CardContent>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
