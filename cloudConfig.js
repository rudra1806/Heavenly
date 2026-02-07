const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
        // Access the filename from nested form field
        let customFilename = req.body?.image?.filename?.trim() || file.originalname.split('.')[0];
        // Sanitize: only allow alphanumeric, hyphens, underscores; add timestamp for uniqueness
        customFilename = customFilename.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
        const uniqueSuffix = `${customFilename}_${Date.now()}`;
        return {
            folder: 'Heavenly_DEV',
            allowed_formats: ['jpg', 'jpeg', 'png', 'avif'],
            public_id: uniqueSuffix
        };
    }
});

module.exports = {
    cloudinary,
    storage
};