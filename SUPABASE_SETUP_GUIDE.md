# Supabase Setup Guide for Smart Mode

This guide walks through all the necessary Supabase configurations to get Smart Mode working with file uploads and AI content generation.

---

## Table of Contents

1. [Run the Database Migration](#1-run-the-database-migration)
2. [Create Storage Bucket](#2-create-storage-bucket)
3. [Set Storage Policies (RLS)](#3-set-storage-policies-rls)
4. [Verify Setup](#4-verify-setup)
5. [Environment Variables](#5-environment-variables)
6. [Troubleshooting](#troubleshooting)

---

## 1. Run the Database Migration

The migration creates two essential tables for Smart Mode:

- **`smart_mode_uploads`** - Stores uploaded files and their parsed content
- **`smart_mode_generations`** - Stores AI-generated content from each file

### Option A: Via Supabase CLI (Recommended)

```bash
# Navigate to your project root
cd /path/to/aura-study

# Push migrations to your Supabase project
supabase db push
```

This will automatically run the `013_smart_mode_v2.sql` migration.

### Option B: Via Supabase Dashboard

1. Open your **Supabase Dashboard** → **SQL Editor**
2. Click **"New Query"**
3. Open the file: `supabase/migrations/013_smart_mode_v2.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **"Run"** (⌘/Ctrl + Enter or the Run button)
7. Verify the tables were created successfully

### What Gets Created

**Table 1: `smart_mode_uploads`**
- Stores uploaded files with metadata
- Tracks parsing status
- Stores extracted text content
- Includes word count and page information
- Has Row Level Security (RLS) enabled

**Table 2: `smart_mode_generations`**
- Stores each generated content item
- Links to parent upload
- Tracks content type (notes, Q&A, interview prep, etc.)
- Stores difficulty level and output format
- Stores generated content as JSON
- Includes generation metadata and timestamps
- Has Row Level Security (RLS) enabled

---

## 2. Create Storage Bucket

Storage buckets hold the actual uploaded files for processing.

### Steps

1. Go to **Supabase Dashboard** → **Storage** section
2. Click **"New bucket"** button
3. Enter the bucket configuration:

| Setting | Value |
|---------|-------|
| **Bucket name** | `smart-mode-uploads` |
| **Public bucket** | ❌ No (Keep private for security) |
| **File size limit** | `10485760` (10MB in bytes) |

4. Click **"Create bucket"**

### Configure Allowed MIME Types

1. After bucket creation, click on the bucket name
2. Go to **Settings** → **File size and MIME types**
3. Add these MIME types (comma-separated or one per line):

```
application/pdf
application/vnd.openxmlformats-officedocument.wordprocessingml.document
text/plain
text/markdown
image/jpeg
image/png
image/webp
```

This allows uploads of:
- PDF documents
- Word documents (.docx)
- Plain text files
- Markdown files
- JPEG images
- PNG images
- WebP images

---

## 3. Set Storage Policies (RLS)

Storage bucket policies in Supabase are configured through the dashboard UI and work differently from table RLS policies. Follow these exact steps.

### Navigate to Storage Policies

1. **Supabase Dashboard** → **Storage**
2. Click on the `smart-mode-uploads` bucket name
3. Go to the **Policies** tab
4. Click **"New Policy"** button
5. Select **"For authenticated users"** (this is the template to start with)

### Policy 1: Allow Authenticated Users to Upload

1. Click **"New Policy"** → Choose **"For authenticated users"**
2. Select **Operation:** `INSERT`
3. **Name the policy:** `Allow authenticated users to upload`
4. In the **Target roles** section, make sure **`authenticated`** is checked
5. You should see a pre-filled expression. It might look like:
   ```
   authenticated
   ```
   Or it might show a more complex one - that's fine.
6. Click **"Review"** then **"Save policy"**

### Policy 2: Allow Users to View All Files

1. Click **"New Policy"**
2. Select **Operation:** `SELECT`
3. **Name:** `Allow authenticated users to download`
4. **Target roles:** `authenticated` (checked)
5. The expression should allow downloads
6. Click **"Review"** → **"Save policy"**

### Policy 3: Allow Users to Delete Their Own Files

1. Click **"New Policy"**
2. Select **Operation:** `DELETE`
3. **Name:** `Allow users to delete own files`
4. **Target roles:** `authenticated` (checked)
5. Keep the default expression (Supabase generates this for you)
6. Click **"Review"** → **"Save policy"**

### Quick Method: Use Template Policies

**Easiest way** - Supabase has pre-built templates:

1. In the **Policies** tab of your bucket, you should see **"New Policy"** 
2. You might see suggested templates like:
   - **"Allow public read access"** - Use only if you want public access
   - **"Allow authenticated read/write"** - This is what you want!
   - **"Allow authenticated uploads"**

3. **For Smart Mode, use:** `Allow authenticated read/write` or similar
4. Click it and Supabase auto-generates the policy
5. Click **"Save"**

### Verify Policies Are Set

After creating policies, you should see them listed:

✅ Should show something like:
- `SELECT` - authenticated
- `INSERT` - authenticated  
- `DELETE` - authenticated
- `UPDATE` - authenticated (if available)

### If Policies Aren't Working

**Common issue:** No policies created yet

**Solution:**
1. Go to **Storage** → Select bucket
2. Go to **Policies** tab
3. If empty, click **"New Policy"**
4. Click **"Enable read access for authenticated users"** (if shown)
5. Click **"Enable write access for authenticated users"** (if shown)
6. This creates all necessary policies at once

### What These Policies Do

| Policy | Effect |
|--------|--------|
| **SELECT** | Authenticated users can download/view files |
| **INSERT** | Authenticated users can upload new files |
| **DELETE** | Authenticated users can delete files |
| **UPDATE** | Authenticated users can update file metadata |

**Note:** Storage policies are simpler than table RLS. They typically just check if the user is authenticated (`auth.uid() IS NOT NULL`) rather than checking ownership of specific files.

---

## 4. Verify Setup

After completing all configurations, verify everything is working:

### Database Verification

In your Supabase Dashboard, go to **SQL Editor** and run:

```sql
-- Check smart_mode_uploads table
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'smart_mode%';

-- Should return:
-- smart_mode_uploads
-- smart_mode_generations
```

Expected output:
```
table_name
────────────────────
smart_mode_uploads
smart_mode_generations
```

### Storage Verification

1. Go to **Storage** → `smart-mode-uploads` bucket
2. Verify:
   - ✅ Bucket exists and is private
   - ✅ File size limit shows "10 MB"
   - ✅ MIME types are configured
   - ✅ Policies are listed (4 policies should show)

### Test Upload (Optional)

1. Go to **Storage** → `smart-mode-uploads`
2. Click **"Upload file"**
3. Try uploading a test document
4. Should succeed without errors
5. Delete the test file after confirming

---

## 5. Environment Variables

Configure API keys for AI services in your deployment environment.

### For Local Development

Create or update `.env.local` in your project root:

```env
# Groq API (Required)
GROQ_API_KEY=your_groq_api_key_here

# Google Gemini API (Required)
GEMINI_API_KEY=your_gemini_api_key_here

# Supabase (Usually already set)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### For Production/Vercel

1. Go to your deployment platform (Vercel, etc.)
2. Go to **Settings** → **Environment Variables**
3. Add the same variables as above

### Getting API Keys

**Groq API Key:**
1. Visit https://console.groq.com
2. Sign in or create account
3. Go to **API Keys** section
4. Create new API key
5. Copy and paste into `.env.local`

**Gemini API Key:**
1. Visit https://aistudio.google.com/app/apikey
2. Click **"Create API key in new project"**
3. Copy the API key
4. Paste into `.env.local`

**Supabase Keys:**
1. Supabase Dashboard → **Settings** → **API**
2. Copy `Project URL` and `anon public` key

---

## 6. Troubleshooting

### Issue: Migration Won't Run

**Error:** `relation "smart_mode_uploads" already exists`

**Solution:** The tables were already created. This is normal. No action needed.

---

### Issue: Can't Upload Files

**Error:** `403 Forbidden` or `Permission denied`

**Solutions:**
1. Verify RLS policies are created (4 policies should exist)
2. Make sure you're logged in as authenticated user
3. Check policies have correct expressions
4. Restart your local development server

---

### Issue: Files Upload but Don't Appear

**Error:** No files visible in bucket despite successful upload

**Solutions:**
1. Check if user is authenticated
2. Verify RLS policies allow SELECT
3. Try uploading to a public bucket temporarily to test
4. Check browser console for errors

---

### Issue: "Unsupported file type" Error

**Error:** Can't upload certain file types

**Solutions:**
1. Verify file MIME types are configured in bucket settings
2. Ensure file is one of the supported types (PDF, DOCX, TXT, MD, JPG, PNG, WebP)
3. Check file extension matches the actual file type
4. Try renaming file with correct extension

---

### Issue: Database Tables Don't Exist

**Error:** `relation "smart_mode_uploads" does not exist`

**Solutions:**
1. Run the migration again via CLI: `supabase db push`
2. Or manually paste migration SQL into SQL Editor
3. Check SQL Editor for error messages
4. Make sure you're in correct Supabase project

---

### Issue: Smart Mode Page Shows Errors

**Error:** Errors in browser console related to database

**Solutions:**
1. Verify both database tables exist
2. Check RLS policies are enabled on both tables
3. Confirm user is authenticated
4. Check `.env.local` has correct Supabase keys
5. Restart development server: `npm run dev`

---

## Next Steps

After completing this setup:

1. ✅ Database migration is applied
2. ✅ Storage bucket is created and configured
3. ✅ RLS policies are in place
4. ✅ Environment variables are set

You can now:
- Upload documents to Smart Mode
- Parse files to extract text
- Generate 6 types of educational content
- Export in multiple formats (JSON, Markdown, TXT, CSV)

### Testing the Setup

1. Run your app: `npm run dev`
2. Navigate to **Smart Mode** page
3. Upload a test document (PDF, DOCX, TXT, MD, or image)
4. Try generating content (Notes, Q&A, etc.)
5. Export in different formats

---

## Support

If you encounter issues:

1. Check the **Troubleshooting** section above
2. Review Supabase dashboard for error messages
3. Check browser console (F12) for client-side errors
4. Check server logs for API errors
5. Verify all environment variables are set correctly

---

## Additional Resources

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Supabase Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [Smart Mode Feature Documentation](./SMART_MODE_FEATURES.md)
