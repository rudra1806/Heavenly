/**
 * Media Service — controller for Cloudinary image operations.
 * 
 * Centralizes all cloud storage interactions so other services
 * only deal with URLs, not cloud provider SDKs.
 */

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.CLOUD_API_KEY,
    api_secret: process.env.CLOUD_API_SECRET
});

// Multer storage configured for Cloudinary
const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
        let customFilename = req.body?.filename?.trim() || file.originalname.split('.')[0];
        customFilename = customFilename.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
        const uniqueSuffix = `${customFilename}_${Date.now()}`;
        return {
            folder: 'Heavenly_DEV',
            allowed_formats: ['jpg', 'jpeg', 'png', 'avif'],
            public_id: uniqueSuffix
        };
    }
});

const upload = multer({ storage });

/**
 * POST /media/upload
 * 
 * Uploads an image to Cloudinary and returns the URL + filename.
 * Uses multer middleware to handle multipart form data.
 */
async function uploadImage(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No image file provided.'
            });
        }

        console.log(`[Media] Image uploaded: ${req.file.filename}`);

        res.status(201).json({
            success: true,
            data: {
                url: req.file.path,
                filename: req.file.filename
            }
        });
    } catch (err) {
        console.error('[Media] Upload error:', err.message);
        res.status(500).json({ success: false, error: 'Image upload failed.' });
    }
}

/**
 * DELETE /media/:filename
 * 
 * Deletes an image from Cloudinary by its public_id (filename).
 */
async function deleteImage(req, res) {
    try {
        const { filename } = req.params;

        if (!filename || filename === 'default.jpg') {
            return res.status(400).json({
                success: false,
                error: 'Invalid filename or cannot delete default image.'
            });
        }

        const result = await cloudinary.uploader.destroy(filename);

        console.log(`[Media] Image deleted: ${filename} (result: ${result.result})`);

        res.json({
            success: true,
            message: `Image "${filename}" deleted.`,
            data: { result: result.result }
        });
    } catch (err) {
        console.error('[Media] Delete error:', err.message);
        res.status(500).json({ success: false, error: 'Image deletion failed.' });
    }
}

module.exports = {
    upload,
    uploadImage,
    deleteImage
};
