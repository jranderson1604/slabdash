console.log('CREDS:', process.env.GOOGLE_CLOUD_CREDENTIALS ? 'EXISTS-'+process.env.GOOGLE_CLOUD_CREDENTIALS.length+'chars' : 'MISSING');
const vision = require('@google-cloud/vision');
const express = require('express');
const router = express.Router();
const multer = require('multer');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const client = new vision.ImageAnnotatorClient({
  credentials: JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
});

router.post('/scan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const [result] = await client.textDetection({
      image: { content: req.file.buffer }
    });

    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      return res.status(400).json({ error: 'No text found', data: null });
    }

    const fullText = detections[0].description;
    const data = parseSubmissionForm(fullText);

    res.json({ success: true, data });
  } catch (error) {
    console.error('SCANNER ERROR:', error);
    res.status(500).json({ error: 'Failed to process image', details: error.message });
  }
});

function parseSubmissionForm(text) {
  console.log('Full text:', text);
  
  const result = {
    customer: { first_name: '', last_name: '', phone: '', email: '', date: '' },
    submission: { psa_number: '', service_level: '' }
  };

  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Look for JAKE ANDERSON pattern (actual handwritten names)
    if (line.includes('FIRST NAME') && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (nextLine && nextLine.length < 30) {
        result.customer.first_name = nextLine.split(/\s+/)[0];
      }
    }
    
    if (line.includes('LAST NAME') && i + 1 < lines.length) {
      const nextLine = lines[i + 1].trim();
      if (nextLine && nextLine.length < 30) {
        result.customer.last_name = nextLine.split(/\s+/)[0];
      }
    }
    
    // Phone - look for patterns like 6013520293
    const phoneMatch = line.match(/(\d{10})/);
    if (phoneMatch && !result.customer.phone) {
      result.customer.phone = phoneMatch[1];
    }
    
    // Email - look for @ symbol
    const emailMatch = line.match(/([\w\.\-]+@[\w\.\-]+\.\w+)/);
    if (emailMatch) {
      result.customer.email = emailMatch[1];
    }
    
    // Date - MM/DD/YY pattern
    const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{2,4})/);
    if (dateMatch && !result.customer.date) {
      result.customer.date = dateMatch[1];
    }
    
    // PSA number - any 8+ digit number after "PSA SUBMISSION"
    if (line.includes('PSA SUBMISSION') || line.includes('SUBMISSION #')) {
      const numMatch = line.match(/(\d{8,})/);
      if (numMatch) result.submission.psa_number = numMatch[1];
    }
  }
  
  // Service level - check for checkmarks near service names
  const serviceLevels = ['Value', 'Regular', 'Express', 'Super Express', 'Walk-Through'];
  for (const level of serviceLevels) {
    const idx = text.indexOf(level);
    if (idx !== -1) {
      const before = text.substring(Math.max(0, idx - 10), idx);
      if (before.includes('☑') || before.includes('✓') || before.includes('X')) {
        result.submission.service_level = level;
        break;
      }
    }
  }

  console.log('Parsed result:', result);
  return result;
}

router.get('/test', (req, res) => {
  res.json({ status: 'Scanner ready', hasCredentials: !!process.env.GOOGLE_CLOUD_CREDENTIALS });
});

module.exports = router;