/**
 * Card categorization for simplified organization
 * Categories: Sports, TCG (Trading Card Games), Other
 */

// TCG (Trading Card Game) keywords
const TCG_KEYWORDS = [
  // Pokemon
  'pokemon', 'pokémon', 'pikachu', 'charizard', 'mewtwo', 'blastoise', 'venusaur',
  'eevee', 'snorlax', 'gyarados', 'dragonite', 'umbreon', 'espeon', 'vaporeon',
  'jolteon', 'flareon', 'lugia', 'ho-oh', 'rayquaza', 'lucario', 'greninja',
  'bulbasaur', 'squirtle',

  // One Piece
  'one piece', 'luffy', 'zoro', 'nami', 'sanji', 'chopper', 'robin', 'franky',
  'brook', 'usopp', 'shanks', 'ace', 'whitebeard', 'kaido', 'big mom', 'doflamingo',
  'bandai',

  // Magic: The Gathering
  'magic', 'mtg', 'gathering', 'planeswalker', 'black lotus', 'mox', 'jace',
  'liliana', 'chandra', 'garruk', 'nissa', 'ajani', 'teferi', 'urza',

  // Yu-Gi-Oh
  'yugioh', 'yu-gi-oh', 'blue eyes', 'dark magician', 'exodia',

  // Digimon
  'digimon', 'agumon', 'gabumon', 'greymon'
];

// Sports keywords (all sports combined)
const SPORTS_KEYWORDS = [
  // Basketball
  'hoops', 'nba', 'prizm basketball', 'select basketball', 'court kings',
  'chronicles basketball', 'donruss basketball', 'optic basketball',
  'lebron', 'jordan', 'kobe', 'curry', 'durant', 'giannis', 'embiid',
  'jokic', 'tatum', 'luka', 'doncic', 'wembanyama', 'victor', 'anthony edwards',
  'kawhi', 'harden', 'westbrook', 'lillard', 'booker', 'young', 'morant',
  'lakers', 'celtics', 'warriors', 'bulls', 'heat', 'knicks', 'nets', 'bucks',
  'sixers', '76ers', 'clippers', 'mavericks', 'nuggets', 'suns', 'grizzlies',
  'cooper flagg',

  // Football
  'nfl', 'prizm football', 'select football', 'optic football', 'chronicles football',
  'donruss football', 'score football',
  'mahomes', 'brady', 'allen', 'burrow', 'herbert', 'lawrence', 'stroud', 'manning',
  'rodgers', 'jackson', 'lamar', 'hurts', 'prescott', 'dak', 'daniels', 'caleb williams',
  'patriots', 'cowboys', 'packers', '49ers', 'niners', 'steelers', 'eagles',
  'chiefs', 'bills', 'bengals', 'ravens', 'rams', 'chargers', 'browns', 'jets',

  // Baseball
  'mlb', 'topps', 'bowman', 'diamond kings', 'stadium club', 'donruss baseball',
  'chronicles baseball', 'heritage', 'allen & ginter', 'gypsy queen',
  'trout', 'ohtani', 'judge', 'acuna', 'betts', 'mookie', 'tatis', 'soto',
  'guerrero', 'vlad', 'harper', 'turner', 'freeman', 'alvarez', 'yordan',
  'yankees', 'dodgers', 'red sox', 'cubs', 'cardinals', 'astros', 'braves',
  'mets', 'phillies', 'padres', 'giants', 'angels', 'blue jays', 'mariners',

  // Hockey
  'nhl', 'upper deck hockey', 'parkhurst', 'o-pee-chee', 'opc', 'sp authentic', 'the cup',
  'mcdavid', 'matthews', 'crosby', 'ovechkin', 'makar', 'mackinnon', 'draisaitl',
  'pastrnak', 'panarin', 'kucherov', 'bedard', 'connor',
  'maple leafs', 'canadiens', 'bruins', 'rangers', 'penguins', 'blackhawks',
  'red wings', 'flyers', 'oilers', 'lightning', 'avalanche', 'golden knights',

  // College sports
  'college', 'ncaa', 'university', 'duke', 'kentucky', 'kansas', 'ucla',
  'gonzaga', 'carolina', 'unc',

  // WNBA
  'wnba', 'caitlin clark', 'angel reese', 'sabrina ionescu', 'paige bueckers',

  // General sports keywords
  'athlete', 'championship', 'playoff', 'mvp', 'rookie card'
];

/**
 * Detect card category from card data
 * @param {Object} card - Card object with brand, description, player_name, team fields
 * @returns {string} - Category: Sports, TCG, or Other
 */
function detectSport(card) {
  const brand = (card.brand || '').toLowerCase();
  const description = (card.description || '').toLowerCase();
  const playerName = (card.player_name || '').toLowerCase();
  const team = (card.team || '').toLowerCase();
  const combined = `${brand} ${description} ${playerName} ${team}`.toLowerCase();

  // Check for TCG keywords first
  for (const keyword of TCG_KEYWORDS) {
    if (combined.includes(keyword)) {
      return 'TCG';
    }
  }

  // Check for Sports keywords
  for (const keyword of SPORTS_KEYWORDS) {
    if (combined.includes(keyword)) {
      return 'Sports';
    }
  }

  // Default to Other
  return 'Other';
}

module.exports = {
  detectSport
};
