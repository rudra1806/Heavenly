/**
 * RabbitMQ event consumers for the Search Service.
 * 
 * Keeps the in-memory search index synchronized with listing changes:
 *   - listing.created → add to index
 *   - listing.updated → update in index
 *   - listing.deleted → remove from index
 */

const { indexListing, removeFromIndex } = require('../controllers/search.js');

async function setupConsumers(consumeEvent) {
    // Index new listings
    await consumeEvent(
        'search-service.listing-created',
        'listing.created',
        async (data) => {
            indexListing(data);
        }
    );

    // Update existing listings in index
    await consumeEvent(
        'search-service.listing-updated',
        'listing.updated',
        async (data) => {
            indexListing(data); // Overwrite existing entry
        }
    );

    // Remove deleted listings from index
    await consumeEvent(
        'search-service.listing-deleted',
        'listing.deleted',
        async (data) => {
            removeFromIndex(data.listingId);
        }
    );

    console.log('[Search Events] All consumers registered');
}

module.exports = { setupConsumers };
