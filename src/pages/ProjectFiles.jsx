import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Upload,
  FolderPlus,
  Search,
  Trash2,
  Download,
  Folder,
  Loader2,
  X,
  Eye,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { toast } from 'sonner';
import ProjectNavHeader from '@/components/navigation/ProjectNavHeader';
import FilePreviewPanel from '@/components/files/FilePreviewPanel';
import { ProjectSubpageSkeleton } from '@/components/ui/PageSkeletons';
import { folderColors, getFolderColor, getFileIcon, formatFileSize } from '@/lib/fileConstants';

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
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    api.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const projects = await api.entities.Project.filter({ id: projectId });
      return projects[0];
    },
    enabled: !!projectId
  });

  const { data: files = [] } = useQuery({
    queryKey: ['projectFiles', projectId],
    queryFn: () => api.entities.ProjectFile.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId
  });

  const { data: folders = [] } = useQuery({
    queryKey: ['fileFolders', projectId],
    queryFn: () => api.entities.FileFolder.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['teamMembers', projectId],
    queryFn: () => api.entities.TeamMember.filter({ project_id: projectId }),
    enabled: !!projectId
  });

  const { data: allFileComments = [] } = useQuery({
    queryKey: ['allFileComments', projectId],
    queryFn: async () => {
      const fileIds = files.map(f => f.id);
      if (fileIds.length === 0) return [];
      const allComments = [];
      for (const fId of fileIds) {
        try {
          const comments = await api.entities.FileComment.filter({ file_id: fId });
          allComments.push(...comments);
        } catch { /* ignore */ }
      }
      return allComments;
    },
    enabled: !!projectId && files.length > 0,
    staleTime: 30000,
  });

  const getCommentCount = (fileId) => allFileComments.filter(c => c.file_id === fileId).length;

  const deleteFileMutation = useMutation({
    mutationFn: (id) => api.entities.ProjectFile.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] });
      toast.success('File deleted');
    }
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (id) => api.entities.FileFolder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileFolders', projectId] });
      toast.success('Folder deleted');
    }
  });

  const createFolderMutation = useMutation({
    mutationFn: (data) => api.entities.FileFolder.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fileFolders', projectId] });
      setShowNewFolder(false);
      setNewFolderName('');
      toast.success('Folder created');
    }
  });

  const currentFiles = files.filter(f =>
    (currentFolderId ? f.folder_id === currentFolderId : !f.folder_id) &&
    (f.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) : null;

  const handleFileUpload = useCallback(async (e) => {
    const uploadedFiles = e.target.files || e.dataTransfer?.files;
    if (!uploadedFiles?.length) return;

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

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
        successCount++;
      } catch (err) {
          failCount++;
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] });
    setUploading(false);

    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully`);
    }
  }, [projectId, currentFolderId, currentUser, queryClient]);

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

  // Drag-and-drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles?.length) {
      handleFileUpload({ dataTransfer: { files: droppedFiles } });
    }
  }, [handleFileUpload]);

  // Preview navigation
  const handleNavigateFile = (direction) => {
    if (!selectedFile) return;
    const idx = currentFiles.findIndex(f => f.id === selectedFile.id);
    if (direction === 'prev' && idx > 0) {
      setSelectedFile(currentFiles[idx - 1]);
    } else if (direction === 'next' && idx < currentFiles.length - 1) {
      setSelectedFile(currentFiles[idx + 1]);
    }
  };
  const selectedFileIndex = selectedFile ? currentFiles.findIndex(f => f.id === selectedFile.id) : -1;

  if (!project) return <ProjectSubpageSkeleton />;

  return (
    <div
      className="min-h-screen bg-background"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <ProjectNavHeader project={project} currentPage="ProjectFiles" />

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-teal-600/10 backdrop-blur-sm flex items-center justify-center pointer-events-none"
          >
            <div className="bg-card rounded-2xl p-8 shadow-2xl border-2 border-dashed border-teal-500 text-center">
              <Upload className="w-12 h-12 text-teal-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground">Drop files to upload</h3>
              <p className="text-sm text-muted-foreground mt-1">Files will be added to {currentFolder?.name || 'root'}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 shadow-lg shadow-teal-200/50 dark:shadow-teal-900/30">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">Documents & Files</h1>
              <p className="text-sm text-muted-foreground">
                {files.length} file{files.length !== 1 ? 's' : ''}{folders.length > 0 ? ` · ${folders.length} folder${folders.length !== 1 ? 's' : ''}` : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowNewFolder(true)} className="dark:border-slate-700 dark:text-slate-300">
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

        {/* Upload progress banner */}
        <AnimatePresence>
          {uploading && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800/50 p-3 mb-4 flex items-center gap-3"
            >
              <Loader2 className="w-5 h-5 text-teal-600 animate-spin flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-teal-700 dark:text-teal-300">Uploading files...</p>
                <div className="w-full bg-teal-100 dark:bg-teal-800/30 rounded-full h-1.5 mt-1">
                  <div className="bg-teal-500 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Breadcrumb */}
        <div className="bg-card rounded-2xl border border-slate-100 dark:border-border p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setCurrentFolderId(null)}
                className={cn(
                  "hover:text-teal-600 transition-colors",
                  currentFolderId ? "text-muted-foreground" : "text-foreground font-medium"
                )}
              >
                All Files
              </button>
              {currentFolder && (
                <>
                  <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                  <span className="text-foreground font-medium flex items-center gap-1.5">
                    <Folder className={cn("w-3.5 h-3.5", getFolderColor(currentFolder.color).text)} />
                    {currentFolder.name}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* New Folder Form */}
        <AnimatePresence>
          {showNewFolder && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card rounded-2xl border border-slate-200 dark:border-border p-4 mb-6"
            >
              <div className="flex items-center gap-3">
                <Input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
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
        </AnimatePresence>

        {/* Folders */}
        {!currentFolderId && folders.length > 0 && !searchQuery && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Folders</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {folders.map(folder => {
                const colorConfig = getFolderColor(folder.color);
                const folderFileCount = files.filter(f => f.folder_id === folder.id).length;
                return (
                  <motion.div
                    key={folder.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group bg-card rounded-xl border border-slate-200 dark:border-border p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer"
                    onClick={() => setCurrentFolderId(folder.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className={cn("p-2 rounded-lg", colorConfig.bg, colorConfig.darkBg)}>
                        <Folder className={cn("w-5 h-5", colorConfig.text, colorConfig.darkText)} />
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
                    <h4 className="font-medium text-foreground mt-2 truncate">{folder.name}</h4>
                    <p className="text-xs text-muted-foreground">{folderFileCount} file{folderFileCount !== 1 ? 's' : ''}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Files section header */}
        {(currentFiles.length > 0 || currentFolderId) && !searchQuery && (
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {currentFolder ? `Files in ${currentFolder.name}` : 'Files'}
          </h3>
        )}

        {/* Files */}
        <div className="space-y-2">
          <AnimatePresence>
            {currentFiles.length > 0 ? (
              currentFiles.map((file, idx) => {
                const FileIcon = getFileIcon(file.file_type);
                const isImage = file.file_type?.includes('image');
                const commentCount = getCommentCount(file.id);
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ delay: idx * 0.02 }}
                    className="group bg-card rounded-xl border border-slate-100 dark:border-border p-3.5 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 transition-all cursor-pointer"
                    onClick={() => setSelectedFile(file)}
                  >
                    <div className="flex items-center gap-4">
                      {/* Thumbnail or icon */}
                      {isImage ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700/50 flex-shrink-0">
                          <img
                            src={file.file_url}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 flex-shrink-0">
                          <FileIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate text-sm">{file.name}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{formatFileSize(file.size)}</span>
                          <span>·</span>
                          <span>{file.uploaded_by_name}</span>
                          <span>·</span>
                          <span>{format(new Date(file.created_date), 'MMM d, yyyy')}</span>
                          {commentCount > 0 && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5 text-teal-600 dark:text-teal-400">
                                <MessageSquare className="w-3 h-3" />
                                {commentCount}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setSelectedFile(file)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <a href={file.file_url} target="_blank" rel="noopener noreferrer" download onClick={(e) => e.stopPropagation()}>
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
                className="bg-card rounded-2xl border-2 border-dashed border-slate-200 dark:border-border p-16 text-center"
              >
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 inline-block mb-4">
                  <Upload className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchQuery ? 'No files match your search' : currentFolderId ? 'This folder is empty' : 'No files yet'}
                </h3>
                <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                  {searchQuery ? 'Try a different search term' : 'Drag and drop files here or click the button below to upload'}
                </p>
                {!searchQuery && (
                  <label className="cursor-pointer">
                    <Button className="bg-teal-600 hover:bg-teal-700" asChild>
                      <span>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Files
                      </span>
                    </Button>
                    <input type="file" multiple onChange={handleFileUpload} className="hidden" />
                  </label>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* File Preview Panel */}
      <FilePreviewPanel
        file={selectedFile}
        onClose={() => setSelectedFile(null)}
        onNavigate={handleNavigateFile}
        hasPrev={selectedFileIndex > 0}
        hasNext={selectedFileIndex < currentFiles.length - 1}
        currentUser={currentUser}
        teamMembers={teamMembers}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => !open && setDeleteConfirm({ open: false, type: null, item: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm.type === 'folder'
                ? 'This will delete the folder. Files inside will be moved to the root level.'
                : 'This action cannot be undone.'}
            </AlertDialogDescription>
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
