const express = require('express');
const router = express.Router();

// Privacy Policy
router.get('/privacy', (req, res) => {
    res.render('pages/privacy.ejs');
});

// Terms of Service
router.get('/terms', (req, res) => {
    res.render('pages/terms.ejs');
});

// Contact Us
router.get('/contact', (req, res) => {
    res.render('pages/contact.ejs');
});

// Contact Us Form Submission
// TODO: Implement actual email sending functionality (e.g., nodemailer, SendGrid, etc.)
// For now, we just show a success message to provide user feedback
router.post('/contact', (req, res) => {
    // Temporarily showing success message without actually sending email
    // Real implementation should:
    // 1. Validate form data
    // 2. Send email using email service (nodemailer, SendGrid, AWS SES, etc.)
    // 3. Store message in database (optional)
    // 4. Handle errors appropriately
    req.flash('success', 'Thank you for contacting us! We\'ll get back to you soon.');
    res.redirect('/contact');
});

module.exports = router;
