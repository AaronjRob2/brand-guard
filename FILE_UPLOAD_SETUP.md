# File Upload & Parsing Setup

## Overview

Brand Guard now supports intelligent file upload and parsing with:
- **OCR for Images** (Tesseract.js)
- **PDF Text Extraction** (pdf-parse)
- **Word Document Parsing** (mammoth.js)
- **Color Extraction** (get-image-colors)
- **Metadata Analysis**

## Supported File Types

### Images (OCR + Color Extraction)
- ✅ **JPEG/JPG** - Full OCR + color palette extraction
- ✅ **PNG** - Full OCR + color palette extraction  
- ✅ **GIF** - OCR support (colors may vary)

**Features:**
- Text extraction via Tesseract OCR
- Dominant color palette extraction
- Confidence scoring for OCR accuracy
- Language detection

### PDFs (Text + Metadata)
- ✅ **PDF** - Complete text extraction + metadata

**Features:**
- Full text content extraction
- Page count detection
- Document metadata (title, author, creation date)
- File version information

### Word Documents (Text + Formatting)
- ✅ **DOCX** - Text + formatting analysis
- ⚠️ **DOC** - Legacy format (limited support)

**Features:**
- Complete text extraction
- Font family detection
- Font size analysis
- Formatting preservation

### Text Files
- ✅ **TXT** - Plain text processing
- ✅ **MD** - Markdown content
- ✅ **JSON** - Structured data

## Database Schema

### Tables Created:
1. **uploaded_files** - File metadata and status
2. **file_processing_results** - Parsed content and analysis
3. **file_analysis_queue** - Background processing queue

### File Processing Flow:
1. **Upload** → File saved to `/uploads/{user_id}/`
2. **Queue** → Auto-queued for processing
3. **Parse** → Content extracted based on file type
4. **Store** → Results saved to database
5. **Complete** → Status updated, ready for analysis

## API Endpoints

### User Endpoints
- `POST /api/user/upload/process` - Upload and process files
- `GET /api/user/files` - Get user's uploaded files
- `GET /api/user/files/[fileId]` - Get file details + results

### Admin Endpoints  
- `GET /api/admin/files` - View all uploaded files + stats
- `GET /api/admin/files/queue` - Monitor processing queue

## Features Implemented

### 🚀 Smart Upload Interface
- **Drag & Drop** - Intuitive file selection
- **Progress Tracking** - Real-time upload progress
- **File Validation** - Type and size checking
- **Batch Processing** - Multiple files at once

### 🔍 Intelligent Parsing
- **Multi-format Support** - Images, PDFs, Word docs
- **Content Extraction** - Text, colors, fonts, metadata
- **Error Handling** - Graceful failure management
- **Processing Metrics** - Performance tracking

### 📊 Analysis Dashboard
- **Upload History** - View all processed files
- **Processing Status** - Real-time status updates
- **Results Preview** - Quick content overview
- **Export Options** - Data export capabilities

### 🛡️ Security & Performance
- **User Isolation** - Files stored per user
- **Row-Level Security** - Database access control
- **Processing Limits** - Timeout and size limits
- **Error Recovery** - Automatic retry logic

## Example Extracted Data

### From Images:
```json
{
  "text": "Brand Guidelines\nLogo Usage Rules",
  "wordCount": 4,
  "colors": ["#FF6B35", "#2E86AB", "#A23B72"],
  "confidence": 0.92,
  "language": "eng"
}
```

### From PDFs:
```json
{
  "text": "Our brand voice is friendly...",
  "wordCount": 1247,
  "pageCount": 15,
  "metadata": {
    "title": "Brand Guidelines 2024",
    "author": "Marketing Team"
  }
}
```

### From Word Docs:
```json
{
  "text": "Marketing copy guidelines...",
  "wordCount": 892,
  "fontFamilies": ["Arial", "Helvetica"],
  "fontSizes": [12, 14, 18, 24]
}
```

## File Size Limits

- **Maximum file size**: 10MB per file
- **Batch limit**: 10 files per upload
- **Storage**: Files stored in `/uploads/{user_id}/`
- **Cleanup**: Automatic cleanup after 30 days (configurable)

## Performance Notes

### Processing Times (Approximate):
- **Text files**: < 100ms
- **PDFs**: 200ms - 2s (depending on size)
- **Word docs**: 300ms - 1s
- **Images (OCR)**: 2s - 10s (depending on complexity)

### Optimization Features:
- **Concurrent processing** - Multiple files in parallel
- **Progress feedback** - Real-time user updates
- **Error isolation** - Failed files don't stop others
- **Memory management** - Efficient resource usage

## Troubleshooting

### Common Issues:

1. **"File too large"**
   - Reduce file size to under 10MB
   - Consider splitting large documents

2. **"OCR failed"**
   - Image may be too blurry or low quality
   - Try higher resolution image

3. **"Unsupported format"**
   - Check supported file types above
   - Convert to supported format

4. **"Processing timeout"**
   - Large files may timeout
   - Try smaller files or contact admin

### Admin Monitoring:
- Use `/api/admin/files/queue` to monitor processing
- Check database `file_analysis_queue` table for errors
- Review server logs for detailed error information