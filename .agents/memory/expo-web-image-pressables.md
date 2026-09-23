---
name: Expo Web image pressables
description: A React Native Web interaction constraint for tappable images with visual overlays.
---

Full-screen gradients and decorative overlay views rendered above a `Pressable` can intercept taps in Expo Web even when the underlying image is visually clickable. Make decorative overlays ignore pointer events through their styles; the `pointerEvents` component prop is deprecated in current React Native Web.

**Why:** The product image zoom affordance appeared correctly but did not respond to clicks in Simulate on Web because the gradient layer received the pointer event first.

**How to apply:** For any tappable image with overlays, keep the `Pressable` as the interactive layer and set `pointerEvents: 'none'` in the styles of decorative overlays and hints. Keep functional controls, such as close or back buttons, outside those ignored layers.