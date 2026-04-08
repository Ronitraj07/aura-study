# Fix for 413 Payload Too Large Error in Smart Mode File Upload

## Problem
The `/api/parse` endpoint was returning a **413 Payload Too Large** error when users tried to upload files to the Smart Mode feature, even for files only 5MB in size.

**Root Cause:** Vercel enforces a **4.5MB payload limit at the edge router level**, before requests reach the serverless function. This is a platform-wide limitation that affects all Vercel deployments on the Hobby plan.

## Solution Implemented

### 1. **Reduced File Size Limit to 4MB**
- Changed max file upload size from 10MB → 4MB
- This provides a safety buffer (0.5MB) below Vercel's 4.5MB edge limit
- Updated in both:
  - `/api/parse.ts` (backend validation)
  - `src/pages/SmartMode.tsx` (client-side validation and UI text)

### 2. **Fixed UI Button Error**
- Resolved "TypeError: c is not a function" caused by improper `Button asChild` usage with `label`
- Changed from `<Button asChild><label>` pattern to `<Button onClick>` with manual file input trigger
- Ensures proper click handling in production

### 3. **Updated Vercel Configuration**
- Added function-specific config in `vercel.json` for explicit timeout and memory settings
- Switched from Edge runtime → Node.js runtime (for proper multipart form data handling)

## Technical Details

| Setting | Value | Reason |
|---------|-------|--------|
| Max File Size | 4MB | Vercel's edge limit is 4.5MB; 4MB provides safe margin |
| Runtime | Node.js | Supports multipart/form-data; Edge runtime has limitations |
| Max Duration | 30s | Standard timeout for file processing |
| Multipart Parser | formidable | Handles large file uploads properly |

## Changes Made

### `/api/parse.ts`
```typescript
// Before: const MAX_FILE_SIZE = 10 * 1024 * 1024;
// After:
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB (respects Vercel's 4.5MB edge limit)
```

### `src/pages/SmartMode.tsx`
```typescript
// Updated SUPPORTED_TYPES maxSize from "10MB" → "4MB"
// Updated validation and UI text to show 4MB limit
// Fixed Button component usage with proper onClick handler
```

### `vercel.json`
```json
{
  "functions": {
    "api/parse.ts": {
      "maxDuration": 30,
      "memory": 3008
    }
  }
}
```

## User Impact

✅ **Before Fix:**
- Upload fails with 413 error for files > ~4.5MB
- Confusing error message doesn't explain Vercel's limit
- UI incorrectly advertises 10MB support

✅ **After Fix:**
- Files up to 4MB upload successfully
- Clear UI indicates 4MB limit
- Proper error message if user exceeds limit
- Button click handler works without errors

## Vercel Plan Consideration

**Current Limitation (Hobby Plan):**
- Payload limit: 4.5MB
- Upgrade to **Pro Plan** to increase this to larger limits

**For Future Enhancement:**
To support larger files (>4MB), you would need to:
1. Upgrade Vercel to Pro plan
2. Implement chunked upload on client side (split file into <4MB chunks)
3. Add server-side chunk reassembly logic

## Testing Recommendations

1. ✅ Upload a 3MB file (should succeed)
2. ✅ Upload a 4MB file (should succeed)
3. ✅ Attempt to upload 5MB file (should show error)
4. ✅ Verify UI displays correct 4MB limit
5. ✅ Test all file types with smaller files

## Build Status
✅ **Build Successful** - All tests pass, no TypeScript errors
✅ **Production Ready** - Deployed to repository

## Commits
- **99f8160** - Added 413 error fix documentation
- **87d6d1a** - Reduced file size limit to 4MB and fixed Button component error

