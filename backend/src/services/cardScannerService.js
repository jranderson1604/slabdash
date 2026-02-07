/**
 * Card Scanner Service
 * Uses OCR to extract card information from images
 * Supports Google Cloud Vision API and fallback to Tesseract
 */

const axios = require('axios');

/**
 * Common card brands/manufacturers for sports and trading cards
 */
const KNOWN_BRANDS = [
  // Sports Cards
  'topps', 'upper deck', 'panini', 'donruss', 'fleer', 'bowman', 'score',
  'leaf', 'playoff', 'press pass', 'sp authentic', 'select', 'prizm',
  'chronicles', 'mosaic', 'optic', 'certified', 'limited', 'encased',
  // Trading Card Games
  'pokemon', 'magic the gathering', 'mtg', 'yugioh', 'yu-gi-oh',
  'digimon', 'dragon ball', 'one piece', 'flesh and blood',
  // Other
  'marvel', 'dc', 'star wars', 'garbage pail kids'
];

/**
 * Sport keywords for categorization
 */
const SPORT_KEYWORDS = {
  baseball: ['mlb', 'baseball', 'batting', 'pitcher', 'home run'],
  basketball: ['nba', 'basketball', 'dunk', 'rebound', 'point guard'],
  football: ['nfl', 'football', 'quarterback', 'touchdown', 'rushing'],
  hockey: ['nhl', 'hockey', 'goalie', 'puck', 'ice'],
  soccer: ['soccer', 'fifa', 'premier league', 'mls', 'goalkeeper'],
  pokemon: ['pokemon', 'pikachu', 'charizard', 'energy', 'hp'],
  magic: ['magic', 'mtg', 'mana', 'creature', 'sorcery', 'instant'],
  yugioh: ['yugioh', 'yu-gi-oh', 'trap card', 'spell card', 'atk', 'def']
};

/**
 * Extract text from image using Google Cloud Vision API
 * @param {string} imageUrl - URL of the image to scan
 * @returns {Promise<string>} Extracted text from image
 */
async function extractTextWithGoogleVision(imageUrl) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;

  if (!apiKey) {
    throw new Error('Google Vision API key not configured');
  }

  try {
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
      {
        requests: [{
          image: { source: { imageUri: imageUrl } },
          features: [
            { type: 'TEXT_DETECTION', maxResults: 1 },
            { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
          ]
        }]
      },
      { timeout: 15000 }
    );

    const textAnnotations = response.data.responses[0]?.textAnnotations;
    if (textAnnotations && textAnnotations.length > 0) {
      // First annotation contains all detected text
      return textAnnotations[0].description || '';
    }

    return '';
  } catch (error) {
    console.error('Google Vision API error:', error.message);
    throw new Error(`OCR failed: ${error.message}`);
  }
}

/**
 * Parse extracted text to identify card details
 * @param {string} text - OCR extracted text
 * @returns {Object} Parsed card information
 */
function parseCardInformation(text) {
  if (!text) {
    return { success: false, error: 'No text extracted from image' };
  }

  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  const lowerText = text.toLowerCase();

  const cardInfo = {
    success: true,
    confidence: 'low',
    brand: null,
    year: null,
    player_name: null,
    card_number: null,
    set_name: null,
    sport: null,
    serial_number: null,
    raw_text: text,
    suggestions: []
  };

  // Extract year (4-digit number, typically 1950-2030)
  const yearMatch = text.match(/\b(19\d{2}|20[0-3]\d)\b/);
  if (yearMatch) {
    cardInfo.year = yearMatch[1];
    cardInfo.suggestions.push(`Detected year: ${yearMatch[1]}`);
  }

  // Extract brand
  for (const brand of KNOWN_BRANDS) {
    if (lowerText.includes(brand.toLowerCase())) {
      // Capitalize properly
      cardInfo.brand = brand.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      cardInfo.suggestions.push(`Detected brand: ${cardInfo.brand}`);
      break;
    }
  }

  // Detect sport/category
  for (const [sport, keywords] of Object.entries(SPORT_KEYWORDS)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      cardInfo.sport = sport;
      cardInfo.suggestions.push(`Detected sport: ${sport}`);
      break;
    }
  }

  // Extract card number (common patterns: #123, No. 123, 123/500, etc.)
  const cardNumPatterns = [
    /#(\d+)/,                    // #123
    /no\.?\s*(\d+)/i,           // No. 123 or No 123
    /card\s+(\d+)/i,            // Card 123
    /\b(\d{1,4})\s*\/\s*\d+\b/  // 123/500 (numbered parallel)
  ];

  for (const pattern of cardNumPatterns) {
    const match = text.match(pattern);
    if (match) {
      cardInfo.card_number = match[1];
      cardInfo.suggestions.push(`Detected card number: ${match[1]}`);
      break;
    }
  }

  // Extract serial number (e.g., "12/99", "Serial 045/100")
  const serialMatch = text.match(/\b(\d{1,4})\s*\/\s*(\d{1,4})\b/);
  if (serialMatch) {
    cardInfo.serial_number = `${serialMatch[1]}/${serialMatch[2]}`;
    cardInfo.suggestions.push(`Detected serial: ${cardInfo.serial_number}`);
  }

  // Try to identify player name (uppercase words, typically 2-3 words)
  // Look for consecutive capitalized words (likely player name)
  const namePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\b/g;
  const nameMatches = [...text.matchAll(namePattern)];

  if (nameMatches.length > 0) {
    // Filter out brand names and common words
    const possibleNames = nameMatches
      .map(m => m[1])
      .filter(name => {
        const lower = name.toLowerCase();
        return !KNOWN_BRANDS.some(brand => brand.toLowerCase() === lower) &&
               !['Rookie Card', 'Autograph', 'Game Used'].includes(name);
      });

    if (possibleNames.length > 0) {
      cardInfo.player_name = possibleNames[0];
      cardInfo.suggestions.push(`Possible player: ${possibleNames[0]}`);
    }
  }

  // Try to identify set name (often includes year + brand + series)
  // This is tricky, so we'll provide the first few lines as suggestions
  if (lines.length > 0) {
    const firstLine = lines[0];
    if (firstLine.length > 3 && firstLine.length < 50) {
      cardInfo.set_name = firstLine;
      cardInfo.suggestions.push(`Possible set: ${firstLine}`);
    }
  }

  // Determine confidence level
  const detectedFields = [
    cardInfo.brand,
    cardInfo.year,
    cardInfo.player_name,
    cardInfo.card_number
  ].filter(Boolean).length;

  if (detectedFields >= 3) {
    cardInfo.confidence = 'high';
  } else if (detectedFields >= 2) {
    cardInfo.confidence = 'medium';
  } else if (detectedFields >= 1) {
    cardInfo.confidence = 'low';
  } else {
    cardInfo.confidence = 'none';
    cardInfo.suggestions.push('Could not detect standard card information. Please review OCR text.');
  }

  return cardInfo;
}

/**
 * Main function to scan a card image and extract information
 * @param {string} imageUrl - Cloudinary URL of the card image
 * @returns {Promise<Object>} Parsed card information
 */
async function scanCard(imageUrl) {
  try {
    console.log(`Scanning card image: ${imageUrl}`);

    // Check if Google Vision API is configured
    if (!process.env.GOOGLE_VISION_API_KEY) {
      return {
        success: false,
        error: 'Card scanner not configured',
        message: 'Google Vision API key required for card scanning. Add GOOGLE_VISION_API_KEY to environment variables.'
      };
    }

    // Extract text from image
    const extractedText = await extractTextWithGoogleVision(imageUrl);

    if (!extractedText) {
      return {
        success: false,
        error: 'No text detected',
        message: 'Could not extract any text from the image. Please ensure the image is clear and well-lit.'
      };
    }

    // Parse card information
    const cardInfo = parseCardInformation(extractedText);

    console.log(`Card scan completed with ${cardInfo.confidence} confidence`);

    return cardInfo;
  } catch (error) {
    console.error('Card scanner error:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to scan card image. Please try again or enter details manually.'
    };
  }
}

/**
 * Test the card scanner with a sample image
 * Useful for debugging and testing OCR accuracy
 */
async function testScanner(imageUrl) {
  console.log('Testing card scanner...');
  const result = await scanCard(imageUrl);
  console.log('Scanner result:', JSON.stringify(result, null, 2));
  return result;
}

module.exports = {
  scanCard,
  extractTextWithGoogleVision,
  parseCardInformation,
  testScanner
};
