import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import mammoth from 'mammoth'
// pdf-parse will be dynamically imported to avoid ENOENT errors

// Service role client for bypassing RLS policies
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export interface BrandGuidelines {
  content: string
  fileType: string
  fileName: string
  extractedAt: string
}

export async function extractBrandGuidelinesFromFile(
  brandFileId: string, 
  userId: string
): Promise<BrandGuidelines> {
  // Get the user's drive tokens
  const { data: driveTokens, error: tokenError } = await supabaseAdmin
    .from('drive_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle()

  if (tokenError) {
    throw new Error(`Database error checking drive tokens: ${tokenError.message}`)
  }

  if (!driveTokens) {
    throw new Error('Google Drive authentication expired or missing. Please reconnect to Google Drive.')
  }

  // Set up Google OAuth client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  oauth2Client.setCredentials({
    access_token: driveTokens.access_token,
    refresh_token: driveTokens.refresh_token
  })

  // Create Drive client
  const drive = google.drive({ version: 'v3', auth: oauth2Client })

  // Get file metadata
  console.log('🔍 Getting file metadata for brandFileId:', brandFileId)
  const fileMetadata = await drive.files.get({
    fileId: brandFileId,
    fields: 'id,name,mimeType,size'
  })

  if (!fileMetadata.data) {
    throw new Error('Brand file not found')
  }

  const { name, mimeType } = fileMetadata.data
  console.log('📋 File metadata:', {
    name,
    mimeType,
    size: fileMetadata.data.size,
    id: fileMetadata.data.id
  })

  // Extract content based on file type
  let content = ''

  if (mimeType === 'application/pdf') {
    // Handle PDF files with dynamic import to avoid ENOENT errors
    console.log('📄 Processing PDF file...')
    
    try {
      const response = await drive.files.get({
        fileId: brandFileId,
        alt: 'media'
      }, { responseType: 'arraybuffer' })
      
      const buffer = Buffer.from(response.data as ArrayBuffer)
      console.log('📄 PDF buffer size:', buffer.length, 'bytes')
      
      // Dynamically import pdf-parse to avoid initialization errors
      console.log('📚 Dynamically importing pdf-parse...')
      const pdfParse = (await import('pdf-parse')).default
      
      console.log('🔍 Parsing PDF content...')
      const pdfData = await pdfParse(buffer)
      content = pdfData.text
      
      console.log('✅ PDF parsed successfully:', {
        textLength: content.length,
        pages: pdfData.numpages,
        info: pdfData.info
      })
      
    } catch (pdfError) {
      console.error('❌ PDF parsing failed:', pdfError)
      content = `[PDF document: ${name}. Text extraction failed. Please try converting to a different format for better analysis.]`
    }

  } else if (mimeType === 'application/vnd.google-apps.document') {
    // Handle Google Docs - export as plain text
    const response = await drive.files.export({
      fileId: brandFileId,
      mimeType: 'text/plain'
    })
    content = response.data as string

  } else if (mimeType === 'application/vnd.google-apps.presentation') {
    // Handle Google Slides - export as plain text
    const response = await drive.files.export({
      fileId: brandFileId,
      mimeType: 'text/plain'
    })
    content = response.data as string

  } else if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    // Handle Google Sheets - comprehensive content extraction
    console.log('📊 Processing Google Sheets for brand guidelines...')
    
    try {
      // Try to export as structured text first (TSV for better parsing)
      console.log('🔄 Exporting Google Sheets as TSV...')
      const tsvResponse = await drive.files.export({
        fileId: brandFileId,
        mimeType: 'text/tab-separated-values'
      })
      
      const tsvContent = tsvResponse.data as string
      
      if (tsvContent && tsvContent.trim().length > 0) {
        // Parse TSV content into structured format for brand guidelines
        const lines = tsvContent.split('\n').filter(line => line.trim())
        const structuredContent = lines.map((line, index) => {
          const cells = line.split('\t')
          return `Row ${index + 1}: ${cells.join(' | ')}`
        }).join('\n')
        
        content = `[Brand Guidelines from Google Sheets: ${name}]

This spreadsheet contains brand guideline information organized in rows and columns.

Structured Content:
${structuredContent}

Raw Data:
${tsvContent}

Note: This content has been extracted from a Google Sheets document and formatted for brand compliance analysis.`
        
        console.log('✅ Google Sheets processed successfully, extracted:', {
          totalLines: lines.length,
          contentLength: content.length,
          firstFewLines: lines.slice(0, 3)
        })
      } else {
        throw new Error('Empty TSV content received')
      }
      
    } catch (tsvError) {
      console.log('⚠️ TSV export failed, trying CSV fallback:', tsvError)
      
      try {
        // Fallback to CSV export
        const csvResponse = await drive.files.export({
          fileId: brandFileId,
          mimeType: 'text/csv'
        })
        
        const csvContent = csvResponse.data as string
        
        if (csvContent && csvContent.trim().length > 0) {
          // Parse CSV content
          const lines = csvContent.split('\n').filter(line => line.trim())
          const structuredContent = lines.map((line, index) => {
            // Simple CSV parsing (handles basic cases)
            const cells = line.split(',').map(cell => cell.replace(/^"(.*)"$/, '$1'))
            return `Row ${index + 1}: ${cells.join(' | ')}`
          }).join('\n')
          
          content = `[Brand Guidelines from Google Sheets: ${name}]

This spreadsheet contains brand guideline information in CSV format.

Structured Content:
${structuredContent}

Raw CSV Data:
${csvContent}

Note: This content has been extracted from a Google Sheets document via CSV export.`
          
          console.log('✅ Google Sheets CSV processed successfully')
        } else {
          throw new Error('Empty CSV content received')
        }
        
      } catch (csvError) {
        console.error('❌ Both TSV and CSV export failed:', csvError)
        content = `[Google Sheets: ${name}. Unable to export spreadsheet content. Please ensure the sheet contains data and try converting to Google Docs or PDF format for better analysis.]`
      }
    }

  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
             mimeType === 'application/msword' ||
             mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.template' ||
             mimeType === 'application/vnd.ms-word.document.macroEnabled.12') {
    
    // Handle Word documents (.docx, .doc, .dotx, .docm)
    console.log('📥 Downloading DOCX file content from Google Drive...')
    
    try {
      console.log('🔍 Requesting file from Google Drive:', {
        fileId: brandFileId,
        alt: 'media',
        responseType: 'arraybuffer'
      })
      
      const response = await drive.files.get({
        fileId: brandFileId,
        alt: 'media'
      }, { responseType: 'arraybuffer' })
      
      console.log('📥 Google Drive response received:', {
        status: response.status,
        statusText: response.statusText,
        hasData: !!response.data,
        dataType: typeof response.data,
        isArrayBuffer: response.data instanceof ArrayBuffer,
        contentLength: response.headers?.['content-length'],
        contentType: response.headers?.['content-type']
      })
      
      if (!response.data) {
        throw new Error('No file data received from Google Drive')
      }
      
      // Validate ArrayBuffer before converting to Buffer
      const arrayBuffer = response.data as ArrayBuffer
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Invalid or empty ArrayBuffer received from Google Drive')
      }
      
      const buffer = Buffer.from(arrayBuffer)
      console.log('📄 DOCX buffer created:', {
        bufferLength: buffer.length,
        isBuffer: Buffer.isBuffer(buffer),
        arrayBufferLength: arrayBuffer.byteLength,
        first16Bytes: Array.from(buffer.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' ')
      })
      
      if (buffer.length === 0) {
        throw new Error('Empty buffer - file may be corrupted or inaccessible')
      }
      
      // Validate that this looks like a DOCX file (should start with PK signature)
      const signature = buffer.slice(0, 4)
      if (signature[0] !== 0x50 || signature[1] !== 0x4B) {
        console.log('⚠️ File does not have ZIP/DOCX signature, but continuing...')
      } else {
        console.log('✅ Valid DOCX file signature detected')
      }
      
      // For .docx files, use mammoth with proper error handling
      if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.template' ||
          mimeType === 'application/vnd.ms-word.document.macroEnabled.12') {
        
        console.log('🔍 Extracting text from DOCX using mammoth...')
        
        try {
          console.log('🔍 Buffer validation:', {
            isBuffer: Buffer.isBuffer(buffer),
            bufferLength: buffer.length,
            bufferType: typeof buffer,
            hasData: !!response.data,
            arrayBufferSize: (response.data as ArrayBuffer)?.byteLength
          })
          
          // Ensure we have a proper Node.js Buffer for mammoth
          let mammothInput
          let result
          
          // Method 1: Try with proper Buffer (most reliable)
          if (Buffer.isBuffer(buffer) && buffer.length > 0) {
            console.log('🔄 Using Node.js Buffer approach...')
            mammothInput = { buffer: buffer }
            
            try {
              result = await mammoth.extractRawText(mammothInput)
              console.log('✅ Buffer approach succeeded')
            } catch (bufferError: any) {
              console.log('❌ Buffer approach failed:', bufferError?.message || bufferError)
              
              // Method 2: Try creating a fresh buffer from ArrayBuffer
              console.log('🔄 Trying fresh buffer from ArrayBuffer...')
              const freshBuffer = Buffer.from(response.data as ArrayBuffer)
              mammothInput = { buffer: freshBuffer }
              
              try {
                result = await mammoth.extractRawText(mammothInput)
                console.log('✅ Fresh buffer approach succeeded')
              } catch (freshBufferError: any) {
                console.log('❌ Fresh buffer failed:', freshBufferError?.message || freshBufferError)
                
                // Method 3: Try with arrayBuffer property (last resort)
                console.log('🔄 Trying arrayBuffer property...')
                mammothInput = { arrayBuffer: response.data as ArrayBuffer }
                
                try {
                  result = await mammoth.extractRawText(mammothInput)
                  console.log('✅ ArrayBuffer approach succeeded')
                } catch (arrayBufferError: any) {
                  console.log('❌ All approaches failed')
                  throw new Error(`DOCX parsing failed - all methods exhausted. Buffer: ${bufferError?.message || bufferError}, Fresh: ${freshBufferError?.message || freshBufferError}, ArrayBuffer: ${arrayBufferError?.message || arrayBufferError}`)
                }
              }
            }
          } else {
            throw new Error(`Invalid buffer received - isBuffer: ${Buffer.isBuffer(buffer)}, length: ${buffer?.length}`)
          }
          
          content = result.value
          console.log('✅ DOCX text extracted successfully, length:', content.length)
          
          if (result.messages && result.messages.length > 0) {
            console.log('⚠️ Mammoth extraction warnings:', result.messages)
          }
          
          if (!content || content.trim().length === 0) {
            console.log('⚠️ DOCX extraction returned empty content, using fallback')
            content = `[DOCX document: ${name}. The document appears to be empty or contains only formatting. Please ensure the document has text content for brand guidelines analysis.]`
          }
          
        } catch (mammothError: any) {
          console.error('❌ All mammoth extraction methods failed:', mammothError)
          content = `[DOCX document: ${name}. Text extraction failed. Error: ${mammothError?.message || mammothError}. Please try converting to PDF or plain text format for better analysis.]`
        }
        
      } else {
        // For older .doc files
        console.log('⚠️ Old .doc format detected, attempting extraction...')
        try {
          let result
          
          // Use the same robust approach for .doc files
          if (Buffer.isBuffer(buffer) && buffer.length > 0) {
            try {
              result = await mammoth.extractRawText({ buffer: buffer })
              console.log('✅ .doc buffer approach succeeded')
            } catch (bufferError: any) {
              console.log('❌ .doc buffer approach failed:', bufferError?.message || bufferError)
              
              try {
                const freshBuffer = Buffer.from(response.data as ArrayBuffer)
                result = await mammoth.extractRawText({ buffer: freshBuffer })
                console.log('✅ .doc fresh buffer approach succeeded')
              } catch (freshBufferError: any) {
                console.log('❌ .doc fresh buffer failed:', freshBufferError?.message || freshBufferError)
                throw new Error(`Old .doc parsing failed: ${bufferError?.message || bufferError}`)
              }
            }
          } else {
            throw new Error(`Invalid buffer for .doc file - isBuffer: ${Buffer.isBuffer(buffer)}, length: ${buffer?.length}`)
          }
          
          content = result.value
          
          if (!content || content.trim().length === 0) {
            content = `[Word document: ${name}. This appears to be an older .doc format with limited text extraction. Please save as .docx or PDF format for better analysis.]`
          }
        } catch (oldDocError: any) {
          console.log('❌ Failed to parse old .doc format:', oldDocError?.message || oldDocError)
          content = `[Word document: ${name}. This appears to be an older .doc format that requires conversion. Please save as .docx format for better text extraction.]`
        }
      }
      
    } catch (docError) {
      console.error('❌ Error processing Word document:', docError)
      content = `[Word document: ${name}. Document could not be processed due to a technical issue. Please try converting to PDF or plain text format for analysis.]`
    }

  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
             mimeType === 'application/vnd.ms-powerpoint') {
    // Handle PowerPoint files - these need special handling
    content = `[PowerPoint presentation: ${name}. Content extraction for presentations requires additional processing. Please convert to PDF or text format for better analysis.]`

  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
             mimeType === 'application/vnd.ms-excel') {
    // Handle Excel files - comprehensive content extraction
    console.log('📊 Processing Excel spreadsheet for brand guidelines...')
    
    try {
      // For Excel files, we need to download the file and parse it
      console.log('📥 Downloading Excel file from Google Drive...')
      const response = await drive.files.get({
        fileId: brandFileId,
        alt: 'media'
      }, { responseType: 'arraybuffer' })
      
      if (!response.data) {
        throw new Error('No file data received from Google Drive')
      }
      
      // For now, provide structured content indication
      // In the future, could add xlsx parsing library like 'xlsx' or 'exceljs'
      content = `[Excel Spreadsheet: ${name}]

This Excel file contains brand guideline information organized in spreadsheet format.

File Details:
- File Type: ${mimeType}
- Size: ${(response.data as ArrayBuffer).byteLength} bytes

Note: This is an Excel spreadsheet that may contain:
- Brand color palettes and hex codes
- Typography guidelines and font specifications  
- Logo usage rules and sizing guidelines
- Brand voice and tone guidelines
- Compliance rules and restrictions
- Style guide specifications

For better text analysis, consider:
1. Converting to Google Sheets and then selecting it as your brand file
2. Exporting key sections to a Word document or PDF
3. Converting to CSV format with clear headers and guidelines

The analysis will continue using the default database brand rules.`
      
      console.log('✅ Excel file processed (basic support)')
      
    } catch (excelError) {
      console.error('❌ Error processing Excel file:', excelError)
      content = `[Excel spreadsheet: ${name}. Unable to process Excel file content. Please convert to Google Sheets, CSV, or text format for better analysis.]`
    }

  } else if (mimeType === 'text/plain' ||
             mimeType === 'text/markdown' ||
             mimeType === 'text/html' ||
             mimeType === 'text/css') {
    // Handle text-based files
    const response = await drive.files.get({
      fileId: brandFileId,
      alt: 'media'
    })
    content = response.data as string

  } else if (mimeType === 'text/rtf' || mimeType === 'application/rtf') {
    // Handle RTF files - basic text extraction
    const response = await drive.files.get({
      fileId: brandFileId,
      alt: 'media'
    })
    let rtfContent = response.data as string
    // Basic RTF to text conversion (removes most RTF formatting)
    content = rtfContent.replace(/\\[a-z]+\d*\s?/gi, '').replace(/[{}]/g, '').trim()

  } else if (mimeType === 'application/json') {
    // Handle JSON files (design tokens, style guides)
    const response = await drive.files.get({
      fileId: brandFileId,
      alt: 'media'
    })
    const jsonData = JSON.parse(response.data as string)
    content = `[JSON data from ${name}]\n${JSON.stringify(jsonData, null, 2)}`

  } else if (mimeType === 'application/xml' || mimeType === 'text/xml') {
    // Handle XML files
    const response = await drive.files.get({
      fileId: brandFileId,
      alt: 'media'
    })
    content = `[XML data from ${name}]\n${response.data as string}`

  } else if (mimeType?.startsWith('image/')) {
    // Handle image files - provide metadata
    content = `[Image file: ${name} (${mimeType}). Image content analysis requires OCR processing. Consider providing a text description of the image content or convert to PDF with text for better analysis.]`

  } else if (mimeType === 'application/zip' ||
             mimeType === 'application/x-zip-compressed' ||
             mimeType === 'application/x-rar-compressed' ||
             mimeType === 'application/x-7z-compressed') {
    // Handle archive files
    content = `[Archive file: ${name} (${mimeType}). Archive content extraction not implemented. Please extract files manually and upload individual brand guideline documents.]`

  } else if (mimeType === 'application/postscript' ||
             mimeType === 'application/x-photoshop' ||
             mimeType === 'image/vnd.adobe.photoshop') {
    // Handle Adobe files
    content = `[Adobe file: ${name} (${mimeType}). Adobe file content extraction not implemented. Please export to PDF or image format for analysis.]`

  } else if (mimeType === 'application/vnd.oasis.opendocument.text' ||
             mimeType === 'application/vnd.oasis.opendocument.presentation' ||
             mimeType === 'application/vnd.oasis.opendocument.spreadsheet') {
    // Handle OpenDocument files
    content = `[OpenDocument file: ${name} (${mimeType}). OpenDocument format support not fully implemented. Please convert to Microsoft Office or PDF format for better analysis.]`

  } else {
    throw new Error(`Unsupported file type: ${mimeType}. Supported formats include PDF, Word documents, Google Docs, text files, images, and more.`)
  }

  if (!content || content.trim().length === 0) {
    throw new Error('No text content could be extracted from the brand guidelines file')
  }

  return {
    content: content.trim(),
    fileType: mimeType || 'unknown',
    fileName: name || 'unknown',
    extractedAt: new Date().toISOString()
  }
}

// Helper function to generate brand rules from extracted content
export function generateBrandRulesFromContent(guidelines: BrandGuidelines): string {
  return `Brand Guidelines from "${guidelines.fileName}":

${guidelines.content}

---
Extracted at: ${guidelines.extractedAt}
File type: ${guidelines.fileType}

Please analyze the uploaded content against these specific brand guidelines and identify any violations or areas of non-compliance.`
}