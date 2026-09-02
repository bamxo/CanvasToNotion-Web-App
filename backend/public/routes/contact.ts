// src/routes/contact.ts
// Mounted at /contact (and /api/contact) in index.ts.
// Port of backend/netlify/functions/contact.ts.
//
//   POST /  -> accepts multipart/form-data (fields + files) OR application/json.
//
// `multer` (memoryStorage) runs on this router BEFORE the controller so uploads
// are parsed here rather than by the global express.json(). The frontend sends
// files under the `attachments` field (see frontend/src/components/Contact.tsx),
// but `.any()` accepts every field name so the endpoint is tolerant.
import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { handleContact } from '../controllers/contactControllers';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 5,
  },
});

// Wrap multer so its errors (oversized file, too many files, malformed
// multipart) become a 400 JSON response instead of Express's default HTML 500 -
// closer to the Netlify function's behaviour.
const parseUploads = (req: Request, res: Response, next: NextFunction): void => {
  upload.any()(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        res.status(400).json({ error: `File upload error: ${err.message}` });
        return;
      }
      console.error('Multipart parse error:', err);
      res.status(400).json({
        error: 'Invalid file format. Please check your attachments and try again.',
      });
      return;
    }
    next();
  });
};

router.post('/', parseUploads, handleContact);

export default router;
