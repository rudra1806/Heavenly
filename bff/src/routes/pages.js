/**
 * BFF Static Pages Routes — contact, privacy, terms.
 */

const express = require('express');
const router = express.Router();

router.get('/contact', (req, res) => res.render('pages/contact.ejs'));
router.get('/privacy', (req, res) => res.render('pages/privacy.ejs'));
router.get('/terms', (req, res) => res.render('pages/terms.ejs'));

module.exports = router;
