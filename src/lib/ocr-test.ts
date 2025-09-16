// Test utility for Tesseract.js OCR in Node.js
// This demonstrates proper usage of tesseract.js v5.1.1 in Node.js environment

import { createWorker } from 'tesseract.js'
import { promises as fs } from 'fs'

export async function testOCR(imagePath: string): Promise<void> {
  console.log('🚀 Starting Tesseract.js test...')
  
  try {
    // Read image file
    console.log('📖 Reading image file...')
    const imageBuffer = await fs.readFile(imagePath)
    console.log(`✅ Image loaded: ${imageBuffer.length} bytes`)
    
    // Create worker with English language
    console.log('👷 Creating Tesseract worker...')
    const worker = await createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && m.progress) {
          console.log(`📝 Progress: ${Math.round(m.progress * 100)}%`)
        } else if (m.status) {
          console.log(`🔄 ${m.status}`)
        }
      }
    })
    
    console.log('✅ Worker created successfully')
    
    // Perform OCR
    console.log('🔍 Performing OCR...')
    const startTime = Date.now()
    const { data } = await worker.recognize(imageBuffer)
    const processingTime = Date.now() - startTime
    
    // Display results
    console.log('\n🎉 OCR Results:')
    console.log('─'.repeat(50))
    console.log(`📝 Extracted Text: "${data.text.trim()}"`)
    console.log(`🎯 Confidence: ${data.confidence}%`)
    console.log(`⏱️  Processing Time: ${processingTime}ms`)
    console.log(`📊 Word Count: ${data.words.length}`)
    console.log('─'.repeat(50))
    
    // Clean up
    console.log('🧹 Terminating worker...')
    await worker.terminate()
    console.log('✅ Test completed successfully!')
    
  } catch (error) {
    console.error('❌ OCR test failed:', error)
    throw error
  }
}

// Example usage function
export async function createOCRWorkerExample(): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  
  const worker = await createWorker('eng', 1, {
    logger: (m) => console.log(m.status, m.progress)
  })
  
  // Example with File object (for API usage)
  const mockImageBuffer = Buffer.from('mock-image-data') // Replace with actual image data
  
  try {
    const { data } = await worker.recognize(mockImageBuffer)
    await worker.terminate()
    return data.text
  } catch (error) {
    await worker.terminate()
    throw error
  }
}

// Configuration recommendations for different environments
export const tesseractConfig = {
  // For development
  dev: {
    logger: (m: any) => {
      if (m.status === 'recognizing text') {
        console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
      }
    }
  },
  
  // For production (minimal logging)
  prod: {
    logger: () => {} // Silent
  },
  
  // For debugging (verbose)
  debug: {
    logger: (m: any) => console.log(m)
  }
}