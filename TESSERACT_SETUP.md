# Tesseract.js Setup for Node.js

## ✅ Current Configuration

We're now using **tesseract.js v5.1.1** which is the most Node.js-compatible version.

### Package Installation
```bash
npm install tesseract.js@5.1.1
```

### Why Version 5.1.1?
- ✅ **Better Node.js support** - Fewer worker path issues
- ✅ **Stable API** - `createWorker` function works reliably  
- ✅ **Good performance** - Optimized for server environments
- ❌ **Version 6.x** - Has worker script path issues in Node.js/Next.js

## 🔧 Proper Usage Pattern

### ✅ Correct Way (Current Implementation)
```typescript
import { createWorker } from 'tesseract.js'

async function performOCR(imageBuffer: Buffer): Promise<string> {
  // Create worker with language
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        console.log(`Progress: ${Math.round(m.progress * 100)}%`)
      }
    }
  })
  
  try {
    // Perform OCR
    const { data } = await worker.recognize(imageBuffer)
    return data.text.trim()
  } finally {
    // Always clean up worker
    await worker.terminate()
  }
}
```

### ❌ Wrong Ways (Avoid These)
```typescript
// DON'T: Direct Tesseract.recognize() - causes worker issues
const result = await Tesseract.recognize(image, 'eng')

// DON'T: Manual worker path setting - fragile
const worker = createWorker({
  workerPath: '/path/to/worker.js' // Error-prone
})

// DON'T: Version 6.x syntax in Node.js
const ocrResult = await Tesseract.recognize(buffer, 'eng', {
  // This format has issues in v6.x on Node.js
})
```

## 🛠️ Troubleshooting

### Common Issues & Solutions

1. **MODULE_NOT_FOUND worker script errors**
   - ✅ **Solution**: Use v5.1.1 instead of v6.x
   - ✅ **Solution**: Use `createWorker()` instead of direct `recognize()`

2. **Worker initialization timeout**
   - ✅ **Solution**: Use dynamic imports
   - ✅ **Solution**: Implement proper error handling with fallbacks

3. **Memory leaks**
   - ✅ **Solution**: Always call `worker.terminate()` in finally block

### Environment Compatibility
- ✅ **Node.js** - Works with v5.1.1
- ✅ **Next.js API routes** - Works with proper dynamic imports
- ✅ **Vercel deployment** - Compatible with serverless functions
- ❌ **Browser bundling** - Use different approach for client-side

## 📊 Performance Expectations

| Image Type | Size | Processing Time | Memory Usage |
|------------|------|----------------|--------------|
| Small text | 100KB | 2-5 seconds | ~50MB |
| Medium doc | 500KB | 5-10 seconds | ~100MB |
| Large scan | 2MB | 10-30 seconds | ~200MB |

## 🔄 Alternative Approaches

If tesseract.js still causes issues, consider:

1. **External OCR Service** (Google Vision, AWS Textract)
2. **System Tesseract** (requires `tesseract-ocr` installed)
3. **Cloud Functions** (OCR as separate service)
4. **Fallback Text** (current implementation when OCR fails)

## 🎯 Current Fallback Strategy

Our implementation gracefully handles OCR failures:
- ✅ **OCR Success**: Extracts actual text
- ❌ **OCR Failure**: Returns meaningful placeholder text
- 🔄 **Always Continues**: Brand analysis proceeds regardless

This ensures the app never breaks due to OCR issues while providing the best possible text extraction when available.