/**
 * Feature flags — flip these to toggle whole product areas on/off.
 *
 * Setting BUY_ENABLED = false:
 *   - Hides "Buy", "Shop", basket and checkout from header navigation
 *   - Hides buy-related sections from the homepage
 *   - Hides the basket indicator
 *   - Adds `noindex` to /shop, /basket, /checkout so search engines skip them
 *   - The routes themselves remain functional (so we can re-enable instantly)
 *   - Buy-pathway services are filtered out of the homepage services grid
 *
 * Set to `true` when ready to launch the online shop.
 */
export const BUY_ENABLED = false as boolean;
