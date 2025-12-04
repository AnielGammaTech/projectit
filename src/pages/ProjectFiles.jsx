import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  FileText, 
  Upload,
  FolderPlus,
  Search,
  Trash2,
  Download,
  Folder,
  Image,
  FileSpreadsheet,
  File,
  Loader2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import ProjectNavHeader from '@/components/navigation/ProjectNavHeader';

const folderColors = [
  { name: 'slate', bg: 'bg-slate-100', text: 'text-slate-600' },
  { name: 'red', bg: 'bg-red-100', text: 'text-red-600' },
  { name: 'orange', bg: 'bg-orange-100', text: 'text-orange-600' },
  { name: 'amber', bg: 'bg-amber-100', text: 'text-amber-600' },
  { name: 'green', bg: 'bg-green-100', text: 'text-green-600' },
  { name: 'teal', bg: 'bg-teal-100', text: 'text-teal-600' },
  { name: 'blue', bg: 'bg-blue-100', text: 'text-blue-600' },
  { name: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-600' },
  { name: 'violet', bg: 'bg-violet-100', text: 'text-violet-600' },
  { name: 'pink', bg: 'bg-pink-100', text: 'text-pink-600' }
];

const getFileIcon = (type) => {
  if (!type) return File;
  if (type.includes('image')) return Image;
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return FileSpreadsheet;
  if (type.includes('pdf')) return FileText;
  return File;
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export default function ProjectFiles() {
  const urlParams = new URLSearchParams(window.location.search);
  const projectId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('slate');
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, type: null, item: null });

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await base44.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  const { data: files = [] } = useQuery({
    queryKey: ['projectFiles', projectId],
    queryFn: () => base44.entities.ProjectFile.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['fileFolders', projectId],
    queryFn: () => base44.entities.FileFolder.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const deleteFileMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectFile.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] })
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id) => base44.entities.FileFolder.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['fileFolders', projectId] })
  });

  const createFolderMutation = useMutation({
    mutationFn: (data) => base44.entities.FileFolder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileFolders', projectId] });
      setShowNewFolder(false);
      setNewFolderName('');
    }
  });

  const currentFiles = files.filter(f => 
    (currentFolderId ? f.folder_id === currentFolderId : !f.folder_id) &&
    (f.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;

  const handleFileUpload = async (e) => {
    const uploadedFiles = e.target.files;
    if (!uploadedFiles?.length) return;

    setUploading(true);
    for (const file of uploadedFiles) {
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        await base44.entities.ProjectFile.create({
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
      name: newFolderName.trim(),
      color: newFolderColor
    });
  };

  const handleDelete = () => {
    if (deleteConfirm.type === 'file') {
      deleteFileMutation.mutate(deleteConfirm.item.id);
    } else if (deleteConfirm.type === 'folder') {
      deleteFolderMutation.mutate(deleteConfirm.item.id);
    }
    setDeleteConfirm({ open: false, type: null, item: null });
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/30">
      <ProjectNavHeader project={project} currentPage="ProjectFiles" />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-teal-600 shadow-lg shadow-teal-200">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Documents & Files</h1>
              <p className="text-slate-500">{files.length} files</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNewFolder(true)}>
              <FolderPlus className="w-4 h-4 mr-2" />
              New Folder
            </Button>
            <label className="cursor-pointer">
              <Button className="bg-teal-600 hover:bg-teal-700" disabled={uploading} asChild>
                <span>
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                  Upload Files
                </span>
              </Button>
              <input type="file" multiple onChange={handleFileUpload} className="hidden" disabled={uploading} />
            </label>
          </div>
        </div>

        {/* Search & Breadcrumb */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {currentFolderId && (
              <Button variant="outline" size="sm" onClick={() => setCurrentFolderId(null)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to All Files
              </Button>
            )}
          </div>
        </div>

        {/* New Folder Form */}
        {showNewFolder && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 p-4 mb-6"
          >
            <div className="flex items-center gap-3">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name..."
                className="flex-1"
                autoFocus
              />
              <div className="flex gap-1">
                {folderColors.slice(0, 6).map(c => (
                  <button
                    key={c.name}
                    onClick={() => setNewFolderColor(c.name)}
                    className={cn("w-6 h-6 rounded-full", c.bg, newFolderColor === c.name && "ring-2 ring-offset-1 ring-teal-500")}
                  />
                ))}
              </div>
              <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()} className="bg-teal-600 hover:bg-teal-700">
                Create
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowNewFolder(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Folders */}
        {!currentFolderId && folders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-500 mb-3">Folders</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {folders.map(folder => {
                const colorConfig = folderColors.find(c => c.name === folder.color) || folderColors[0];
                const folderFileCount = files.filter(f => f.folder_id === folder.id).length;
                return (
                  <motion.div
                    key={folder.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn("p-2 rounded-lg", colorConfig.bg)}>
                        <Folder className={cn("w-5 h-5", colorConfig.text)} />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, type: 'folder', item: folder }); }}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </Button>
                    </div>
                    <h4 className="font-medium text-slate-900 mt-2 truncate">{folder.name}</h4>
                    <p className="text-xs text-slate-500">{folderFileCount} files</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Current Folder Header */}
        {currentFolder && (
          <div className="mb-4">
            <Badge variant="outline" className="text-sm">
              <Folder className="w-3.5 h-3.5 mr-1" />
              {currentFolder.name}
            </Badge>
          </div>
        )}

        {/* Files */}
        <div className="space-y-2">
          <AnimatePresence>
            {currentFiles.length > 0 ? (
              currentFiles.map((file, idx) => {
                const FileIcon = getFileIcon(file.file_type);
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: idx * 0.02 }}
                    className="group bg-white rounded-xl border border-slate-100 p-4 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-slate-100">
                        <FileIcon className="w-5 h-5 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-slate-900 truncate">{file.name}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{file.uploaded_by_name}</span>
                          <span>•</span>
                          <span>{format(new Date(file.created_date), 'MMM d, yyyy')}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={file.file_url} target="_blank" rel="noopener noreferrer" download>
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600"
                          onClick={() => setDeleteConfirm({ open: true, type: 'file', item: file })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl border border-slate-100 p-12 text-center"
              >
                <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No files yet</h3>
                <p className="text-slate-500 mb-6">Upload files to organize project documents</p>
                <label className="cursor-pointer">
                  <Button className="bg-teal-600 hover:bg-teal-700" asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Files
                    </span>
                  </Button>
                  <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                </label>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, type: null, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm.type}?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}