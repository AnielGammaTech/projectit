import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = process.env.UPLOAD_DIR || '/data/uploads';

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
   * Get the public URL for an uploaded file
   */
  getFileUrl(filename) {
    const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`;
    return `${baseUrl}/uploads/${filename}`;
  },

  /**
   * Handle an uploaded file and return the URL
   * Called after multer has saved the file to disk
   */
  processUpload(file) {
    return {
      file_url: this.getFileUrl(file.filename),
      file_name: file.originalname,
      file_size: file.size,
      mime_type: file.mimetype,
    };
  },
};

export default fileService;
