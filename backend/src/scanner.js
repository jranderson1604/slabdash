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
  const result = {
    customer: { first_name: '', last_name: '', phone: '', email: '', date: '' },
    submission: { psa_number: '', service_level: '' }
  };

  const nameMatch = text.match(/FIRST NAME:\s*([A-Z\s]+)\s+LAST NAME:\s*([A-Z\s]+)/i);
  if (nameMatch) {
    result.customer.first_name = nameMatch[1].trim();
    result.customer.last_name = nameMatch[2].trim();
  }

  const phoneMatch = text.match(/PHONE NUMBER:\s*([\d\s\-]+)/i);
  if (phoneMatch) {
    result.customer.phone = phoneMatch[1].replace(/\s/g, '').trim();
  }

  const emailMatch = text.match(/EMAIL ADDRESS:\s*([\w\.\-]+@[\w\.\-]+)/i);
  if (emailMatch) {
    result.customer.email = emailMatch[1].trim();
  }

  const dateMatch = text.match(/DATE:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
  if (dateMatch) {
    result.customer.date = dateMatch[1].trim();
  }

  const psaMatch = text.match(/PSA SUBMISSION #:\s*([\d\s]+)/i);
  if (psaMatch) {
    result.submission.psa_number = psaMatch[1].replace(/\s/g, '').trim();
  }

  const serviceLevels = ['Value', 'Regular', 'Express', 'Super Express', 'Walk-Through'];
  for (const level of serviceLevels) {
    if (text.toUpperCase().includes(level.toUpperCase())) {
      result.submission.service_level = level;
      break;
    }
  }

  return result;
}

router.get('/test', (req, res) => {
  res.json({ status: 'Scanner ready', hasCredentials: !!process.env.GOOGLE_CLOUD_CREDENTIALS });
});

module.exports = router;