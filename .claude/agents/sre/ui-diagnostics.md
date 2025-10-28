# UI/Frontend Diagnostics

**Purpose**: Troubleshoot frontend performance, rendering, and user experience issues.

## Common UI Issues

### 1. Slow Page Load

**Symptoms**:
- Users report long loading times
- Lighthouse score <50
- Time to Interactive (TTI) >5 seconds

**Diagnosis**:

#### Check Bundle Size
```bash
# Check JavaScript bundle size
ls -lh dist/*.js

# Analyze bundle composition
npx webpack-bundle-analyzer dist/stats.json

# Check for large dependencies
npm ls --depth=0
```

**Red flags**:
- Main bundle >500KB
- Unused dependencies in bundle
- Multiple copies of same library

**Mitigation**:
- Code splitting: `import()` for dynamic imports
- Tree shaking: Remove unused code
- Lazy loading: Load components on demand

---

#### Check Network Requests
```bash
# Chrome DevTools → Network tab
# Look for:
# - Number of requests (>100 = too many)
# - Large assets (images >200KB)
# - Slow API calls (>1s)
```

**Red flags**:
- Waterfall pattern (sequential loading)
- Large uncompressed images
- Blocking requests

**Mitigation**:
- Image optimization: WebP, lazy loading
- HTTP/2: Multiplexing
- CDN: Cache static assets

---

#### Check Render Performance
```bash
# Chrome DevTools → Performance tab
# Record page load, check:
# - Long tasks (>50ms)
# - Layout thrashing
# - JavaScript execution time
```

**Red flags**:
- Long tasks blocking main thread
- Multiple layout recalculations
- Heavy JavaScript computation

**Mitigation**:
- Web Workers: Move heavy computation off main thread
- requestIdleCallback: Defer non-critical work
- Virtual scrolling: Render only visible items

---

### 2. Memory Leak (UI)

**Symptoms**:
- Browser tab becomes slow over time
- Memory usage increases continuously
- Browser eventually crashes

**Diagnosis**:

#### Chrome DevTools → Memory
```bash
# Take heap snapshot before/after user interaction
# Compare snapshots
# Look for:
# - Detached DOM nodes
# - Event listeners not removed
# - Growing arrays/objects
```

**Red flags**:
- Detached DOM elements increasing
- Event listeners not garbage collected
- Timers/intervals not cleared

**Mitigation**:
```javascript
// Clean up event listeners
componentWillUnmount() {
  element.removeEventListener('click', handler);
  clearInterval(this.intervalId);
  clearTimeout(this.timeoutId);
}

// Use WeakMap for DOM references
const cache = new WeakMap();
```

---

### 3. Unresponsive UI

**Symptoms**:
- Clicks don't register
- Input lag
- Frozen UI

**Diagnosis**:

#### Check Main Thread
```bash
# Chrome DevTools → Performance
# Look for:
# - Long tasks (>50ms)
# - Blocking JavaScript
# - Forced synchronous layout
```

**Red flags**:
- JavaScript blocking >100ms
- Synchronous XHR requests
- Layout thrashing (read → write → read)

**Mitigation**:
```javascript
// Break up long tasks
async function processLargeArray(items) {
  for (let i = 0; i < items.length; i++) {
    await processItem(items[i]);

    // Yield to main thread every 100 items
    if (i % 100 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

// Use requestIdleCallback
requestIdleCallback(() => {
  // Non-critical work
});
```

---

### 4. White Screen / Failed Render

**Symptoms**:
- Blank page
- Error boundary triggered
- Console errors

**Diagnosis**:

#### Check Console Errors
```bash
# Chrome DevTools → Console
# Look for:
# - Uncaught exceptions
# - Network errors (failed chunks)
# - CORS errors
```

**Common causes**:
- JavaScript error in render
- Failed to load chunk (code splitting)
- CORS blocking API calls
- Missing dependencies

**Mitigation**:
```javascript
// Error boundary
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

// Retry failed chunk loads
const retryImport = (fn, retriesLeft = 3) => {
  return new Promise((resolve, reject) => {
    fn()
      .then(resolve)
      .catch(error => {
        if (retriesLeft === 0) {
          reject(error);
        } else {
          setTimeout(() => {
            retryImport(fn, retriesLeft - 1).then(resolve, reject);
          }, 1000);
        }
      });
  });
};
```

---

## UI Performance Metrics

**Core Web Vitals**:
- **LCP** (Largest Contentful Paint): <2.5s (good), <4s (needs improvement), >4s (poor)
- **FID** (First Input Delay): <100ms (good), <300ms (needs improvement), >300ms (poor)
- **CLS** (Cumulative Layout Shift): <0.1 (good), <0.25 (needs improvement), >0.25 (poor)

**Other Metrics**:
- **TTFB** (Time to First Byte): <200ms
- **FCP** (First Contentful Paint): <1.8s
- **TTI** (Time to Interactive): <3.8s

**Measurement**:
```javascript
// Web Vitals library
import {getLCP, getFID, getCLS} from 'web-vitals';

getLCP(console.log);
getFID(console.log);
getCLS(console.log);
```

---

## Common UI Anti-Patterns

### 1. Render Everything Upfront
**Problem**: Rendering 10,000 items at once
**Solution**: Virtual scrolling, pagination, infinite scroll

### 2. No Code Splitting
**Problem**: 5MB JavaScript bundle loaded upfront
**Solution**: Route-based code splitting, lazy loading

### 3. Large Images
**Problem**: 5MB PNG images
**Solution**: WebP, compression, lazy loading, responsive images

### 4. Blocking JavaScript
**Problem**: Heavy computation on main thread
**Solution**: Web Workers, requestIdleCallback, async/await

### 5. Memory Leaks
**Problem**: Event listeners not removed, timers not cleared
**Solution**: Cleanup in componentWillUnmount, WeakMap

---

## UI Diagnostic Checklist

**When diagnosing slow UI**:

- [ ] Check bundle size (target: <500KB gzipped)
- [ ] Check number of network requests (target: <50)
- [ ] Check Core Web Vitals (LCP <2.5s, FID <100ms, CLS <0.1)
- [ ] Check for JavaScript errors in console
- [ ] Check render performance (no long tasks >50ms)
- [ ] Check memory usage (no continuous growth)
- [ ] Check for CORS errors
- [ ] Check for failed chunk loads
- [ ] Check image sizes (target: <200KB per image)
- [ ] Check for blocking resources

**Tools**:
- Chrome DevTools (Network, Performance, Memory, Console)
- Lighthouse
- Web Vitals library
- webpack-bundle-analyzer
- React DevTools Profiler

---

## Related Documentation

- [SKILL.md](../SKILL.md) - Main SRE agent
- [backend-diagnostics.md](backend-diagnostics.md) - Backend troubleshooting
- [monitoring.md](monitoring.md) - Observability tools
