---
name: Expo Web nested card actions
description: A web interaction rule for cards that contain their own buttons.
---

Cards with secondary actions should not be implemented as a Link wrapping a whole Pressable when the card contains nested Pressables. On Expo Web, the parent navigation can still handle the child click after the child action, causing a brief correct screen followed by an unintended redirect.

**Why:** A store map button opened the internal map and then immediately navigated to the store detail because the enclosing Link handled the same click.

**How to apply:** Use a parent Pressable with explicit router navigation, and keep nested action buttons outside that navigation handler; stop propagation only as a secondary safeguard.