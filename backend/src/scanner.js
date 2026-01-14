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
      return res.status(400).json({ error: 'No text found', cards: [] });
    }

    const fullText = detections[0].description;
    const cards = parseSubmissionForm(fullText);

    res.json({ success: true, fullText, cards, cardCount: cards.length });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process image', details: error.message });
  }
});

function parseSubmissionForm(text) {
  const cards = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  
  let currentCard = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const yearMatch = line.match(/\b(19\d{2}|20[0-2]\d)\b/);
    const cardNumMatch = line.match(/#?\s*(\d+)/);
    
    if (yearMatch || (line.length > 5 && line.length < 50)) {
      if (currentCard && (currentCard.player_name || currentCard.year)) {
        cards.push(currentCard);
      }
      
      currentCard = {
        year: yearMatch ? yearMatch[1] : '',
        card_set: '',
        card_number: cardNumMatch ? cardNumMatch[1] : '',
        player_name: '',
        variety: ''
      };
      
      const nameMatch = line.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/);
      if (nameMatch) currentCard.player_name = nameMatch[1];
      
      const brandMatch = line.match(/\b(Topps|Bowman|Upper Deck|Panini|Fleer|Score|Donruss)\b/i);
      if (brandMatch) currentCard.card_set = brandMatch[1];
      
      if (!nameMatch && !yearMatch && line.length > 2) {
        currentCard.player_name = line;
      }
    }
  }
  
  if (currentCard && (currentCard.player_name || currentCard.year)) {
    cards.push(currentCard);
  }

  return cards.filter(card => 
    card.player_name || card.year || card.card_set
  ).map(card => ({
    year: card.year || '',
    card_set: card.card_set || 'Unknown',
    card_number: card.card_number || '',
    player_name: card.player_name || 'Unknown',
    variety: card.variety || ''
  }));
}

router.get('/test', (req, res) => {
  res.json({ status: 'Scanner ready', hasCredentials: !!process.env.GOOGLE_CLOUD_CREDENTIALS });
});

module.exports = router;