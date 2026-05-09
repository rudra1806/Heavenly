/**
 * Media Service routes.
 * 
 * POST   /media/upload     — Upload image to Cloudinary
 * DELETE /media/:filename   — Delete image from Cloudinary
 */

const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/media.js');

// Upload endpoint — multer middleware handles file parsing
router.post('/media/upload', mediaController.upload.single('image'), mediaController.uploadImage);

// Delete endpoint
router.delete('/media/:filename', mediaController.deleteImage);

module.exports = router;
