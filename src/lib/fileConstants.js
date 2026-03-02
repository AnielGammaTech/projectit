import { FileText, Image, FileSpreadsheet, File } from 'lucide-react';

export const folderColors = [
  { name: 'slate', bg: 'bg-slate-100', text: 'text-slate-600', darkBg: 'dark:bg-slate-700/50', darkText: 'dark:text-slate-400' },
  { name: 'red', bg: 'bg-red-100', text: 'text-red-600', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-400' },
  { name: 'orange', bg: 'bg-orange-100', text: 'text-orange-600', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400' },
  { name: 'amber', bg: 'bg-amber-100', text: 'text-amber-600', darkBg: 'dark:bg-amber-900/30', darkText: 'dark:text-amber-400' },
  { name: 'green', bg: 'bg-green-100', text: 'text-green-600', darkBg: 'dark:bg-green-900/30', darkText: 'dark:text-green-400' },
  { name: 'teal', bg: 'bg-teal-100', text: 'text-teal-600', darkBg: 'dark:bg-teal-900/30', darkText: 'dark:text-teal-400' },
  { name: 'blue', bg: 'bg-blue-100', text: 'text-blue-600', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-400' },
  { name: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-600', darkBg: 'dark:bg-indigo-900/30', darkText: 'dark:text-indigo-400' },
  { name: 'violet', bg: 'bg-violet-100', text: 'text-violet-600', darkBg: 'dark:bg-violet-900/30', darkText: 'dark:text-violet-400' },
  { name: 'pink', bg: 'bg-pink-100', text: 'text-pink-600', darkBg: 'dark:bg-pink-900/30', darkText: 'dark:text-pink-400' },
];

export const getFolderColor = (colorName) => {
  return folderColors.find(c => c.name === colorName) || folderColors[0];
};

export const getFileIcon = (type) => {
  if (!type) return File;
  if (type.includes('image')) return Image;
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv')) return FileSpreadsheet;
  if (type.includes('pdf')) return FileText;
  return File;
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const isPreviewable = (type) => {
  if (!type) return false;
  return type.includes('image') || type.includes('pdf');
};
