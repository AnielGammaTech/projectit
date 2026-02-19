import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, File, FileText, Image, Trash2, Download, Loader2, Search, Folder, FolderPlus, ChevronLeft, MoreHorizontal, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const folderColors = {
  slate: 'text-slate-500',
  red: 'text-red-500',
  orange: 'text-orange-500',
  amber: 'text-amber-500',
  yellow: 'text-yellow-500',
  green: 'text-green-500',
  emerald: 'text-emerald-500',
  teal: 'text-teal-500',
  cyan: 'text-cyan-500',
  blue: 'text-blue-500',
  indigo: 'text-indigo-500',
  violet: 'text-violet-500',
  purple: 'text-purple-500',
  pink: 'text-pink-500'
};

const getFileIcon = (type) => {
  if (!type) return File;
  if (type.includes('image')) return Image;
  if (type.includes('pdf') || type.includes('doc')) return FileText;
  return File;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function FilesViewModal({ open, onClose, projectId, currentUser }) {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('blue');

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['projectFiles', projectId],
    queryFn: () => api.entities.ProjectFile.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId && open
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['fileFolders', projectId],
    queryFn: () => api.entities.FileFolder.filter({ project_id: projectId }),
    enabled: !!projectId && open
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.ProjectFile.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] })
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id) => {
      // Move files out of folder first
      const folderFiles = files.filter(f => f.folder_id === id);
      for (const file of folderFiles) {
        await api.entities.ProjectFile.update(file.id, { ...file, folder_id: '' });
      }
      await api.entities.FileFolder.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileFolders', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] });
      setCurrentFolderId(null);
    }
  });

  const createFolderMutation = useMutation({
    mutationFn: (data) => api.entities.FileFolder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileFolders', projectId] });
      setShowNewFolder(false);
      setNewFolderName('');
    }
  });

  const handleFileUpload = async (e) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles?.length) return;

    setUploading(true);
    for (const file of uploadedFiles) {
      try {
        const { file_url } = await api.integrations.Core.UploadFile({ file });
        await api.entities.ProjectFile.create({
          project_id: projectId,
          name: file.name,
          file_url,
          file_type: file.type,
          size: file.size,
          folder_id: currentFolderId || '',
          uploaded_by_email: currentUser?.email,
          uploaded_by_name: currentUser?.full_name || currentUser?.email
        });
      } catch (err) {
        console.error('Failed to upload file:', err);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] });
    setUploading(false);
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate({
      project_id: projectId,
      name: newFolderName,
      color: newFolderColor
    });
  };

  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;
  const displayFiles = files.filter(f => {
    const matchesFolder = currentFolderId ? f.folder_id === currentFolderId : !f.folder_id;
    const matchesSearch = f.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFolder && matchesSearch;
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentFolder && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentFolderId(null)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            <span>{currentFolder ? currentFolder.name : 'Documents & Files'}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Actions Row */}
        <div className="flex gap-2 items-center">
          <label className={cn(
            "flex-1 flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-xl cursor-pointer transition-all",
            uploading ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50"
          )}>
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            ) : (
              <Upload className="w-5 h-5 text-slate-400" />
            )}
            <span className="text-sm text-slate-600">
              {uploading ? 'Uploading...' : 'Upload files'}
            </span>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
          
          {!currentFolderId && (
            <Popover open={showNewFolder} onOpenChange={setShowNewFolder}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FolderPlus className="w-4 h-4" />
                  New Folder
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <Input
                    placeholder="Folder name..."
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                  />
                  <div>
                    <p className="text-xs text-slate-500 mb-2">Color</p>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.keys(folderColors).map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewFolderColor(color)}
                          className={cn(
                            "w-6 h-6 rounded-full transition-all",
                            newFolderColor === color && "ring-2 ring-offset-1 ring-indigo-500"
                          )}
                          style={{ 
                            backgroundColor: color === 'slate' ? '#64748b' : 
                              color === 'red' ? '#ef4444' : color === 'orange' ? '#f97316' :
                              color === 'amber' ? '#f59e0b' : color === 'yellow' ? '#eab308' :
                              color === 'green' ? '#22c55e' : color === 'emerald' ? '#10b981' :
                              color === 'teal' ? '#14b8a6' : color === 'cyan' ? '#06b6d4' :
                              color === 'blue' ? '#3b82f6' : color === 'indigo' ? '#6366f1' :
                              color === 'violet' ? '#8b5cf6' : color === 'purple' ? '#a855f7' : '#ec4899'
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <Button onClick={handleCreateFolder} className="w-full" disabled={!newFolderName.trim()}>
                    Create Folder
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Search */}
        {(files.length > 0 || folders.length > 0) && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2">
          {/* Folders (only show at root) */}
          {!currentFolderId && folders.length > 0 && !searchQuery && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="group flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:shadow-md transition-all"
                  onClick={() => setCurrentFolderId(folder.id)}
                >
                  <Folder className={cn("w-8 h-8", folderColors[folder.color] || folderColors.blue)} fill="currentColor" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-900 truncate">{folder.name}</h4>
                    <p className="text-xs text-slate-500">
                      {files.filter(f => f.folder_id === folder.id).length} files
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteFolderMutation.mutate(folder.id); }} className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}

          {/* Files */}
          {isLoading ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : displayFiles.length === 0 && (currentFolderId || !folders.length) ? (
            <div className="text-center py-12 text-slate-500">
              <File className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p>{searchQuery ? 'No files match your search' : 'No files yet'}</p>
            </div>
          ) : (
            <AnimatePresence>
              {displayFiles.map((file, idx) => {
                const FileIcon = getFileIcon(file.file_type);
                const isOwn = file.uploaded_by_email === currentUser?.email;

                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="group bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-lg bg-slate-100 text-slate-600 shrink-0">
                        <FileIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 truncate">{file.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{file.uploaded_by_name}</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(file.created_date), { addSuffix: true })}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => window.open(file.file_url, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        {isOwn && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-600"
                            onClick={() => deleteMutation.mutate(file.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}