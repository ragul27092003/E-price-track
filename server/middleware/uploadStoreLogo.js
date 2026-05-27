const multer              = require('multer');
const path                = require('path');
const { v2: cloudinary }  = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Store logos land in a separate Cloudinary folder keyed by cmpid
// so every store has its own persistent image that never collides with
// competitor logos (which use the 'competitorlogos' folder).
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req) => {
    const cmpid = req.user?.cmpid || req.headers['x-tenant-id'] || 'store';
    return {
      folder:          'storelogos',
      public_id:       cmpid,          // one stable ID per store → always overwrites the same asset
      overwrite:       true,
      resource_type:   'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'],
    };
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp|svg|ico/;
  const ext  = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) return cb(null, true);
  cb(new Error('Only image files are allowed (jpg, png, gif, webp, svg, ico)'));
};

const uploadStoreLogo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

module.exports = uploadStoreLogo;
