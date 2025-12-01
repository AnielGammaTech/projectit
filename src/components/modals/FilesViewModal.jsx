import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, File, FileText, Image, Trash2, Download, Loader2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

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

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['projectFiles', projectId],
    queryFn: () => base44.entities.ProjectFile.filter({ project_id: projectId }, '-created_date'),
    enabled: !!projectId && open
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProjectFile.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projectFiles', projectId] })
  });

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

  const filteredFiles = files.filter(f => 
    f.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Documents & Files</DialogTitle>
        </DialogHeader>

        {/* Upload Section */}
        <div className="flex gap-3 items-center">
          <label className={cn(
            "flex-1 flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl cursor-pointer transition-all",
            uploading ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50"
          )}>
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            ) : (
              <Upload className="w-5 h-5 text-slate-400" />
            )}
            <span className="text-sm text-slate-600">
              {uploading ? 'Uploading...' : 'Click to upload files'}
            </span>
            <input
              type="file"
              multiple
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        {/* Search */}
        {files.length > 0 && (
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

        {/* Files List */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-slate-400">Loading...</div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <File className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p>{files.length === 0 ? 'No files uploaded yet' : 'No files match your search'}</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredFiles.map((file, idx) => {
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