---
name: SmartMall optional catalog metadata
description: Compatibility rule for grocery, butcher, and optional product metadata when the deployed Laravel schema cannot be migrated.
---

Approved grocery/butcher store types and product presentation metadata may be carried in existing nullable description fields when adding database columns is out of scope. The Eloquent models must decode the envelope back to the clean legacy description and expose only the approved virtual fields; grocery/butcher store rows remain compatible with the existing supermarket enum and repository filtering must decode/filter them after retrieval.

**Why:** The deployed API and repository schema can lag the mobile contract, and changing the schema or checkout/order payloads would break compatibility under a no-migration task constraint.

**How to apply:** Keep the envelope private to the model layer, validate every accepted metadata key server-side, leave empty legacy records untouched, and never leak the encoded carrier string through API responses.