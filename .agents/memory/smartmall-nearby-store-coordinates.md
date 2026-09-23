---
name: SmartMall nearby store coordinates
description: Production data requirements for genuine nearest-store sorting.
---

The live `/api/v1/malls` response currently includes `latitude` and `longitude` fields, but they are null for the existing stores. The mobile app must not infer coordinates from Arabic address text or sort by an invented fallback.

**Why:** A real “nearest to me” result requires both the customer’s device location and trustworthy coordinates for each store. The current Hostinger API has the schema fields but no populated values.

**How to apply:** Keep the nearby control permission-aware and calculate distance only for stores with valid coordinates. Guard null and blank values before numeric conversion so missing coordinates cannot become `0,0`. Populate and verify store coordinates through the authorized production store-management/release path before claiming nearby sorting works for existing stores.