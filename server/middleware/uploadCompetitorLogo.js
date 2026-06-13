const path = require('path');
const fs   = require('fs');

const UPLOAD_DIR = path.join(__dirname, '../uploads/competitor-logos');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Returns a configured multer instance.
// Called at request-time (inside the controller) so it works with any
// multer version and avoids Express-5 startup evaluation issues.
function makeUpload() {
  const multer  = require('multer');

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const slug = _req.params.slug || `competitor_${Date.now()}`;
      const ext  = path.extname(file.originalname).toLowerCase();
      cb(null, `${slug}${ext}`);
    },
  });

  const fileFilter = (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type "${ext}". Allowed: ${allowed.join(', ')}`), false);
    }
  };

  return multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } });
}

// Express middleware: handles the multipart upload then calls next()
const uploadLogoMiddleware = (req, res, next) => {
  makeUpload().single('logo')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
};

module.exports = uploadLogoMiddleware;