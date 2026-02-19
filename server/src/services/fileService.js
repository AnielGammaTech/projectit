import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import supabase from '../config/supabase.js';

const STORAGE_BUCKET = 'uploads';

// Use memory storage — file buffer stays in RAM until uploaded to Supabase
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

const fileService = {
  /**
   * Upload a file to Supabase Storage and return the public URL.
   * Called after multer has processed the upload into req.file (with buffer).
   */
  async processUpload(file) {
    if (!supabase) {
      throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }

    const ext = file.originalname.split('.').pop();
    const filename = `${uuidv4()}.${ext}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error('Supabase Storage upload error:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }

    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);

    return {
      file_url: data.publicUrl,
      file_name: file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
    };
  },

  /**
   * Delete a file from Supabase Storage by its URL or filename.
   */
  async deleteFile(fileUrl) {
    if (!supabase || !fileUrl) return;

    // Extract filename from the Supabase public URL
    // URL format: https://<ref>.supabase.co/storage/v1/object/public/uploads/<filename>
    let filename;
    try {
      const url = new URL(fileUrl);
      const parts = url.pathname.split('/');
      filename = parts[parts.length - 1];
    } catch {
      // If it's just a filename (e.g., from legacy /uploads/), use it directly
      filename = fileUrl.replace(/^\/uploads\//, '');
    }

    if (filename) {
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([filename]);
      if (error) {
        console.error('Supabase Storage delete error:', error);
      }
    }
  },

  /**
   * Get the public URL for a file in Supabase Storage.
   */
  getFileUrl(filename) {
    if (!supabase) return `/uploads/${filename}`;
    const { data } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);
    return data.publicUrl;
  },
};

export default fileService;
