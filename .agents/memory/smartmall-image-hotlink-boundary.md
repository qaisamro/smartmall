---
name: SmartMall image hotlink boundary
description: Referer-sensitive behavior of live Laravel storage images in Expo Web.
---

Some live SmartMall storage images return HTTP 403 when requested with the Replit Expo preview as the `Referer`, while the same files return HTTP 200 with the SmartMall API origin as the `Referer`. Other images may work without it, so the failure is selective.

**Why:** The storage host applies hotlink protection inconsistently across image objects. A simple `cover_image` fallback does not fix an image that is rejected before decoding.

**How to apply:** For mall images in Expo, pass the API-origin `Referer` through the `expo-image` source headers and retain the cover-to-logo fallback. Verify image fixes with the affected store's real storage path, not only a known-good image.