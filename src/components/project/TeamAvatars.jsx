import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Plus, X, Check, Users, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveUploadUrl } from '@/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';

const avatarColors = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500',
  'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500',
  'bg-pink-500', 'bg-rose-500'
];

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getColorForEmail = (email) => {
  if (!email) return avatarColors[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
};

export default function TeamAvatars({ 
  members = [], 
  teamMembers = [], 
  onUpdate, 
  maxVisible = 6 
}) {
  const [open, setOpen] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState(members);
  const [expandedGroups, setExpandedGroups] = useState({});

  // Fetch user groups
  const { data: userGroups = [] } = useQuery({
    queryKey: ['userGroups'],
    queryFn: () => api.entities.UserGroup.list()
  });

  useEffect(() => {
    setSelectedEmails(members);
  }, [members]);

  const visibleMembers = members.slice(0, maxVisible);
  const extraCount = members.length - maxVisible;

  const handleToggle = (email) => {
    setSelectedEmails(prev => 
      prev.includes(email) 
        ? prev.filter(e => e !== email) 
        : [...prev, email]
    );
  };

  const handleAddGroup = (group) => {
    if (!group.member_emails?.length) return;
    setSelectedEmails(prev => {
      const newEmails = [...prev];
      group.member_emails.forEach(email => {
        if (!newEmails.includes(email)) {
          newEmails.push(email);
        }
      });
      return newEmails;
    });
  };

  const handleSave = () => {
    onUpdate(selectedEmails);
    setOpen(false);
  };

  const getMemberName = (email) => {
    const member = teamMembers.find(m => m.email === email);
    return member?.name || email;
  };

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 px-3 text-xs gap-1.5 border-dashed"
          >
            <Plus className="w-3.5 h-3.5" />
            Set up people
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="p-3 border-b border-slate-100">
            <h4 className="font-medium text-sm">Project Members</h4>
            <p className="text-xs text-slate-500">Select who has access</p>
          </div>
          
          {/* User Groups Section */}
          {userGroups.length > 0 && (
            <div className="p-2 border-b border-slate-100">
              <p className="text-xs font-medium text-slate-500 px-2 mb-2">Add by Group</p>
              <div className="space-y-1">
                {userGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => handleAddGroup(group)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-indigo-50 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Users className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{group.name}</p>
                      <p className="text-xs text-slate-500">{group.member_emails?.length || 0} members</p>
                    </div>
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="max-h-48 overflow-y-auto p-2">
            <p className="text-xs font-medium text-slate-500 px-2 mb-2">Individual Members</p>
            {teamMembers.length === 0 ? (
              <p className="text-sm text-slate-500 p-2 text-center">No team members yet</p>
            ) : (
              teamMembers.map((member) => (
                <label
                  key={member.id}
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors",
                    selectedEmails.includes(member.email) ? "bg-indigo-50" : "hover:bg-slate-50"
                  )}
                >
                  <Checkbox
                    checked={selectedEmails.includes(member.email)}
                    onCheckedChange={() => handleToggle(member.email)}
                  />
                  {member.avatar_url ? (
                    <img src={resolveUploadUrl(member.avatar_url)} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                  ) : (
                    <div className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium",
                      getColorForEmail(member.email)
                    )}>
                      {getInitials(member.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{member.name}</p>
                    <p className="text-xs text-slate-500 truncate">{member.email}</p>
                  </div>
                </label>
              ))
            )}
          </div>
          <div className="p-2 border-t border-slate-100 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
              <Check className="w-3.5 h-3.5 mr-1" />
              Save
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <div className="flex -space-x-2">
        {visibleMembers.map((email, idx) => {
          const member = teamMembers.find(m => m.email === email);
          const avatarUrl = member?.avatar_url;
          return avatarUrl ? (
            <img
              key={email}
              src={resolveUploadUrl(avatarUrl)}
              alt={getMemberName(email)}
              title={getMemberName(email)}
              className="w-8 h-8 rounded-full object-cover border-2 border-white flex-shrink-0"
              style={{ zIndex: maxVisible - idx }}
            />
          ) : (
            <div
              key={email}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-white",
                getColorForEmail(email)
              )}
              title={getMemberName(email)}
              style={{ zIndex: maxVisible - idx }}
            >
              {getInitials(getMemberName(email))}
            </div>
          );
        })}
        {extraCount > 0 && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-200 text-slate-600 text-xs font-medium border-2 border-white">
            +{extraCount}
          </div>
        )}
      </div>
    </div>
  );
}