/**
 * BFF Listing Routes — renders EJS templates with data from Listing Service.
 * 
 * Handles multipart form data (image uploads) via multer,
 * forwards files to Media Service, then creates/updates listings via API Gateway.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { apiCall, GATEWAY_URL } = require('../utils/apiClient.js');
const { isLoggedIn } = require('../middleware.js');

// Multer with memory storage — files stay in RAM, forwarded to Media Service
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

/**
 * Uploads a file buffer to the Media Service and returns { url, filename }.
 * If no file is provided, returns null.
 */
async function uploadImage(file, session) {
    if (!file) return null;

    try {
        const formData = new FormData();
        const blob = new Blob([file.buffer], { type: file.mimetype });
        formData.append('image', blob, file.originalname);

        const url = `${GATEWAY_URL}/api/media/upload`;
        const headers = {};
        if (session?.accessToken) {
            headers['Authorization'] = `Bearer ${session.accessToken}`;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: formData
        });

        const data = await response.json();
        if (data.success && data.data?.url) {
            return { url: data.data.url, filename: data.data.filename || file.originalname };
        }
    } catch (err) {
        console.warn('[BFF] Image upload failed:', err.message);
    }
    return null;
}

// GET /listings — index page
router.get('/listings', async (req, res) => {
    try {
        const search = req.query.search || '';
        const url = search ? `/api/search?q=${encodeURIComponent(search)}` : '/api/listings';
        const data = await apiCall(url);
        res.render('listings/index.ejs', {
            listings: data.data?.listings || data.data?.results || [],
            searchQuery: search,
            searchPerformed: !!search
        });
    } catch (err) {
        req.flash('error', 'Failed to load listings.');
        res.redirect('/');
    }
});

// GET /listings/new — new listing form
router.get('/listings/new', isLoggedIn, (req, res) => {
    res.render('listings/new.ejs');
});

// GET /listings/:id — show listing
router.get('/listings/:id', async (req, res) => {
    try {
        const [listingRes, reviewsRes] = await Promise.all([
            apiCall(`/api/listings/${req.params.id}`),
            apiCall(`/api/reviews?listingId=${req.params.id}`)
        ]);

        const listing = listingRes.data?.listing;
        if (!listing) {
            req.flash('error', 'Listing not found.');
            return res.redirect('/listings');
        }

        // Fetch owner info
        let owner = null;
        if (listing.ownerId) {
            try {
                const ownerRes = await apiCall(`/api/auth/users/${listing.ownerId}`, { session: req.session });
                owner = ownerRes.data?.user;
            } catch { /* owner fetch failed — show listing without owner info */ }
        }

        res.render('listings/show.ejs', {
            listing,
            reviews: reviewsRes.data?.reviews || [],
            averageRating: reviewsRes.data?.averageRating || 0,
            owner
        });
    } catch (err) {
        req.flash('error', 'Failed to load listing.');
        res.redirect('/listings');
    }
});

// POST /listings — create listing (multipart form with optional image)
router.post('/listings', isLoggedIn, upload.single('image[url]'), async (req, res) => {
    try {
        // Build listing body from parsed form fields
        const body = {
            title: req.body.title,
            description: req.body.description,
            price: req.body.price,
            location: req.body.location,
            country: req.body.country,
            maxGuests: req.body.maxGuests
        };

        // Handle image: upload file to Media Service, or use provided filename
        const uploaded = await uploadImage(req.file, req.session);
        if (uploaded) {
            body.image = uploaded;
        } else if (req.body.image?.filename) {
            body.image = { filename: req.body.image.filename, url: '' };
        }

        await apiCall('/api/listings', {
            method: 'POST',
            body,
            session: req.session
        });
        req.flash('success', 'Listing created successfully!');
        res.redirect('/listings');
    } catch (err) {
        req.flash('error', err.message || 'Failed to create listing.');
        res.redirect('/listings/new');
    }
});

// GET /listings/:id/edit — edit form
router.get('/listings/:id/edit', isLoggedIn, async (req, res) => {
    try {
        const data = await apiCall(`/api/listings/${req.params.id}`);
        const listing = data.data?.listing;
        if (!listing) {
            req.flash('error', 'Listing not found.');
            return res.redirect('/listings');
        }
        res.render('listings/edit.ejs', { listing });
    } catch (err) {
        req.flash('error', 'Failed to load listing.');
        res.redirect('/listings');
    }
});

// PUT /listings/:id — update listing (multipart form with optional image)
router.put('/listings/:id', isLoggedIn, upload.single('image[url]'), async (req, res) => {
    try {
        const body = {
            title: req.body.title,
            description: req.body.description,
            price: req.body.price,
            location: req.body.location,
            country: req.body.country,
            maxGuests: req.body.maxGuests
        };

        // Handle image update
        const uploaded = await uploadImage(req.file, req.session);
        if (uploaded) {
            body.image = uploaded;
        }

        await apiCall(`/api/listings/${req.params.id}`, {
            method: 'PUT',
            body,
            session: req.session
        });
        req.flash('success', 'Listing updated successfully!');
        res.redirect(`/listings/${req.params.id}`);
    } catch (err) {
        req.flash('error', err.message || 'Failed to update listing.');
        res.redirect(`/listings/${req.params.id}/edit`);
    }
});

// DELETE /listings/:id — delete listing
router.delete('/listings/:id', isLoggedIn, async (req, res) => {
    try {
        await apiCall(`/api/listings/${req.params.id}`, {
            method: 'DELETE',
            session: req.session
        });
        req.flash('success', 'Listing deleted successfully!');
        res.redirect('/listings');
    } catch (err) {
        req.flash('error', err.message || 'Failed to delete listing.');
        res.redirect(`/listings/${req.params.id}`);
    }
});

module.exports = router;
