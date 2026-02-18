import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directory exists
if (!existsSync(UPLOAD_DIR)) {
  mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `${uuidv4()}.${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

const fileService = {
  /**
   * Get the public URL for an uploaded file.
   * Accepts an optional Express `req` object to build an absolute URL
   * even when the API_URL env var is not configured.
   */
  getFileUrl(filename, req) {
    if (process.env.API_URL) {
      return `${process.env.API_URL}/uploads/${filename}`;
    }
    if (req) {
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const host = req.get('host');
      return `${protocol}://${host}/uploads/${filename}`;
    }
    // Fallback: relative path
    return `/uploads/${filename}`;
  },

  /**
   * Handle an uploaded file and return the URL
   * Called after multer has saved the file to disk
   */
  processUpload(file, req) {
    return {
      file_url: this.getFileUrl(file.filename, req),
      file_name: file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
    };
  },
};

export default fileService;
