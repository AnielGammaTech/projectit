import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Ticket, Link2, Plus, ExternalLink, Unlink, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

export default function HaloPSATicketLink({ project, onUpdate }) {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [ticketId, setTicketId] = useState('');
  const [summary, setSummary] = useState(project?.name || '');
  const [details, setDetails] = useState(project?.description || '');

  const ticketMutation = useMutation({
    mutationFn: async (params) => {
      const response = await base44.functions.invoke('haloPSATicket', params);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ['project', project.id] });
      onUpdate?.();
      setShowCreateDialog(false);
      setShowLinkDialog(false);
      setTicketId('');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || error.message);
    }
  });

  const handleCreate = () => {
    ticketMutation.mutate({
      action: 'create',
      projectId: project.id,
      summary: summary || project.name,
      details: details || project.description,
      clientId: project.customer_id
    });
  };

  const handleLink = () => {
    if (!ticketId.trim()) {
      toast.error('Please enter a ticket ID');
      return;
    }
    ticketMutation.mutate({
      action: 'link',
      projectId: project.id,
      ticketId: ticketId.trim()
    });
  };

  const handleUnlink = () => {
    ticketMutation.mutate({
      action: 'unlink',
      projectId: project.id
    });
  };

  const hasTicket = project?.halopsa_ticket_id;

  if (hasTicket) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={project.halopsa_ticket_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium transition-colors"
        >
          <Ticket className="w-4 h-4" />
          Ticket #{project.halopsa_ticket_id}
          <ExternalLink className="w-3 h-3" />
        </a>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleUnlink}
          disabled={ticketMutation.isPending}
          className="text-slate-400 hover:text-red-500"
        >
          {ticketMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Unlink className="w-4 h-4" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Ticket className="w-4 h-4" />
            HaloPSA Ticket
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => {
            setSummary(project?.name || '');
            setDetails(project?.description || '');
            setShowCreateDialog(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Create New Ticket
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowLinkDialog(true)}>
            <Link2 className="w-4 h-4 mr-2" />
            Link Existing Ticket
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create HaloPSA Ticket</DialogTitle>
            <DialogDescription>
              Create a new ticket in HaloPSA linked to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Summary</label>
              <Input
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Ticket summary"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Details</label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Ticket details (optional)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={ticketMutation.isPending}>
              {ticketMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Ticket Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link HaloPSA Ticket</DialogTitle>
            <DialogDescription>
              Enter the ID of an existing HaloPSA ticket to link to this project.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-1 block">Ticket ID</label>
            <Input
              value={ticketId}
              onChange={(e) => setTicketId(e.target.value)}
              placeholder="e.g., 12345"
              type="number"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleLink} disabled={ticketMutation.isPending}>
              {ticketMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  Link Ticket
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}