const multer    = require('multer');
const path      = require('path');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const slug = req.params.slug || 'competitor';
    return {
      folder:         'competitorlogos',
      public_id:      slug,                       
      overwrite:      true,
      resource_type:  'image',
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

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB
});

module.exports = upload;