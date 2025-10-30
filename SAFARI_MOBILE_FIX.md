# Safari Mobile Compatibility Fix

## Problem

The web editor did not render correctly on Safari mobile (iOS). The main symptom was that **the app would not render properly when scrolling/moving the screen**.

## Root Cause

Safari mobile has a unique behavior where the address bar dynamically appears and disappears when scrolling. This causes the viewport height to change dynamically:

- **With address bar visible**: Viewport is smaller
- **With address bar hidden**: Viewport is larger (full screen)

The app was using `100vh` (viewport height units) for sizing, which Safari interprets as the **maximum viewport height** (with address bar hidden). When the address bar appears, the content overflows and causes layout thrashing and rendering failures.

### Technical Details

```css
/* BEFORE (broken on Safari mobile) */
#app {
  height: 100vh; /* Fixed height - breaks when address bar appears/disappears */
}
```

When the user scrolls:
1. Address bar shrinks/expands
2. Viewport height changes by ~60-100px
3. App still sized for old viewport height
4. Content overflow causes rendering issues
5. Layout breaks completely

## Solution

We implemented a **dynamic viewport height system** using CSS custom properties and JavaScript:

### 1. CSS Custom Property (app.css)

```css
:root {
  --app-height: 100vh; /* Default fallback */
}

#app {
  height: 100vh; /* Fallback for browsers without custom properties */
  height: var(--app-height); /* Use dynamically updated height */

  /* Prevent overflow on mobile */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}
```

### 2. JavaScript Viewport Tracking (main.ts)

```typescript
function setSafariMobileViewportHeight() {
  const height = window.innerHeight;
  document.documentElement.style.setProperty('--app-height', `${height}px`);
}

// Update on resize (address bar show/hide)
window.addEventListener('resize', setSafariMobileViewportHeight);

// Update on orientation change
window.addEventListener('orientationchange', () => {
  setTimeout(setSafariMobileViewportHeight, 100);
});

// Update on visual viewport resize (most accurate for mobile)
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', setSafariMobileViewportHeight);
}
```

### 3. Enhanced Mobile Meta Tags (index.html)

```html
<!-- Enhanced viewport configuration -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />

<!-- iOS web app configuration -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

## How It Works

1. **Initial Load**: JavaScript calculates actual viewport height and sets `--app-height`
2. **Address Bar Appears**: `resize` event fires → recalculate → update `--app-height`
3. **Address Bar Hides**: `resize` event fires → recalculate → update `--app-height`
4. **Orientation Change**: `orientationchange` event fires → recalculate with delay
5. **Smooth Experience**: App always matches actual viewport, no overflow, no layout breaks

## Benefits

✅ **Fixed Safari mobile rendering** - App now works correctly when scrolling
✅ **Dynamic address bar support** - Adapts smoothly to address bar show/hide
✅ **Orientation change support** - Works in portrait and landscape
✅ **Backward compatible** - Fallback for non-mobile browsers
✅ **No content overflow** - `position: fixed` prevents scroll issues
✅ **Better mobile experience** - Feels like a native app

## Testing

To test the fix on Safari mobile:

1. Open the app on iPhone/iPad Safari
2. Scroll down (address bar should hide)
3. Scroll up (address bar should appear)
4. **Expected**: App resizes smoothly, no rendering issues
5. Rotate device (portrait ↔ landscape)
6. **Expected**: App fills screen correctly in both orientations

## Alternative Approaches Considered

### 1. Using `dvh` (Dynamic Viewport Height)
```css
height: 100dvh; /* CSS feature for dynamic viewport */
```
**Why not used**: Not supported in older iOS versions (< iOS 15.4)

### 2. Using `-webkit-fill-available`
```css
height: -webkit-fill-available;
```
**Why not used**: Doesn't work consistently across all iOS versions

### 3. Accepting the overflow
**Why not used**: Creates unusable experience on mobile

## Related Issues

- Safari iOS viewport height bugs: https://bugs.webkit.org/show_bug.cgi?id=141832
- CSS `dvh` specification: https://www.w3.org/TR/css-values-4/#viewport-relative-lengths
- Visual Viewport API: https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API

## Files Changed

- `src/app.css` - Added CSS custom property and mobile-specific fixes
- `src/main.ts` - Added viewport height tracking
- `index.html` - Enhanced mobile meta tags

---

**Status**: ✅ Fixed (2025-10-29)
**Tested**: Safari iOS 15+, Chrome iOS, Firefox iOS
**Impact**: Critical mobile compatibility fix
