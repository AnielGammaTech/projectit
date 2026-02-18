import { Router } from 'express';
import llmService from '../services/llmService.js';
import emailService from '../services/emailService.js';
import smsService from '../services/smsService.js';
import fileService, { upload } from '../services/fileService.js';

const router = Router();

// POST /api/integrations/invoke-llm
router.post('/invoke-llm', async (req, res, next) => {
  try {
    const { prompt, response_json_schema, file_urls } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }
    const result = await llmService.invoke({ prompt, response_json_schema, file_urls });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/upload-file (multipart/form-data)
router.post('/upload-file', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const result = fileService.processUpload(req.file);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/send-email
router.post('/send-email', async (req, res, next) => {
  try {
    const { to, subject, body, from_name, from_email } = req.body;
    if (!to || !subject) {
      return res.status(400).json({ error: 'to and subject are required' });
    }
    const result = await emailService.send({ to, subject, body, from_name, from_email });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/send-sms
router.post('/send-sms', async (req, res, next) => {
  try {
    const { to, body } = req.body;
    if (!to || !body) {
      return res.status(400).json({ error: 'to and body are required' });
    }
    const result = await smsService.send({ to, body });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/extract-data
// Extracts structured data from an uploaded file using LLM
router.post('/extract-data', async (req, res, next) => {
  try {
    const { file_url, json_schema } = req.body;
    if (!file_url) {
      return res.status(400).json({ error: 'file_url is required' });
    }
    const prompt = `Extract structured data from the file at: ${file_url}\n\nReturn the data matching the provided schema.`;
    const result = await llmService.invoke({
      prompt,
      response_json_schema: json_schema,
      file_urls: [file_url],
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /api/integrations/generate-image
// Placeholder — image generation can be added later
router.post('/generate-image', async (req, res, next) => {
  try {
    res.status(501).json({ error: 'Image generation not yet implemented' });
  } catch (err) {
    next(err);
  }
});

export default router;
