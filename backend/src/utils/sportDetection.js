/**
 * Smart sport detection for card categorization
 * Auto-detects sport/category based on brand, player name, team, and description
 */

// Basketball players (recent and legends)
const BASKETBALL_PLAYERS = [
  'cooper flagg', 'lebron', 'jordan', 'kobe', 'curry', 'durant', 'giannis', 'embiid',
  'jokic', 'tatum', 'luka', 'doncic', 'wembanyama', 'victor', 'anthony edwards',
  'kawhi', 'harden', 'westbrook', 'lillard', 'booker', 'young', 'morant', 'ja'
];

// Football players
const FOOTBALL_PLAYERS = [
  'mahomes', 'brady', 'allen', 'burrow', 'herbert', 'lawrence', 'stroud', 'manning',
  'rodgers', 'jackson', 'lamar', 'hurts', 'prescott', 'dak', 'daniels', 'caleb williams'
];

// Baseball players
const BASEBALL_PLAYERS = [
  'trout', 'ohtani', 'judge', 'acuna', 'betts', 'mookie', 'tatis', 'soto',
  'guerrero', 'vlad', 'harper', 'turner', 'freeman', 'alvarez', 'yordan'
];

// Hockey players
const HOCKEY_PLAYERS = [
  'mcdavid', 'matthews', 'crosby', 'ovechkin', 'makar', 'mackinnon', 'draisaitl',
  'pastrnak', 'panarin', 'kucherov', 'bedard', 'connor'
];

// Basketball teams
const BASKETBALL_TEAMS = [
  'lakers', 'celtics', 'warriors', 'bulls', 'heat', 'knicks', 'nets', 'bucks',
  'sixers', '76ers', 'clippers', 'mavericks', 'nuggets', 'suns', 'grizzlies',
  'duke', 'kentucky', 'kansas', 'ucla', 'gonzaga', 'carolina', 'unc'
];

// Football teams
const FOOTBALL_TEAMS = [
  'patriots', 'cowboys', 'packers', '49ers', 'niners', 'steelers', 'eagles',
  'chiefs', 'bills', 'bengals', 'ravens', 'rams', 'chargers', 'browns', 'jets'
];

// Baseball teams
const BASEBALL_TEAMS = [
  'yankees', 'dodgers', 'red sox', 'cubs', 'cardinals', 'astros', 'braves',
  'mets', 'phillies', 'padres', 'giants', 'angels', 'blue jays', 'mariners'
];

// Hockey teams
const HOCKEY_TEAMS = [
  'maple leafs', 'canadiens', 'bruins', 'rangers', 'penguins', 'blackhawks',
  'red wings', 'flyers', 'oilers', 'lightning', 'avalanche', 'golden knights'
];

function detectSport(card) {
  const brand = (card.brand || '').toLowerCase();
  const description = (card.description || '').toLowerCase();
  const playerName = (card.player_name || '').toLowerCase();
  const team = (card.team || '').toLowerCase();
  const combined = `${brand} ${description} ${playerName} ${team}`.toLowerCase();

  // Pokemon
  if (combined.match(/pokemon|pokémon|pikachu|charizard|eevee|mewtwo|bulbasaur|squirtle/)) {
    return 'Pokemon';
  }

  // One Piece
  if (combined.match(/one piece|luffy|zoro|nami|sanji|chopper|bandai/)) {
    return 'One Piece';
  }

  // Magic: The Gathering
  if (combined.match(/magic|mtg|gathering|black lotus|planeswalker/)) {
    return 'Magic';
  }

  // Basketball - Brand detection
  if (brand.match(/hoops|prizm basketball|select basketball|court kings|donruss basketball|optic basketball/)) {
    return 'Basketball';
  }

  // Football - Brand detection
  if (brand.match(/prizm football|select football|donruss football|optic football|chronicles football/)) {
    return 'Football';
  }

  // Baseball - Brand detection
  if (brand.match(/topps|bowman|stadium club|heritage|allen & ginter|gypsy queen|donruss baseball/)) {
    return 'Baseball';
  }

  // Hockey - Brand detection
  if (brand.match(/upper deck hockey|sp authentic|the cup|opc|o-pee-chee/)) {
    return 'Hockey';
  }

  // Basketball - Player detection
  for (const player of BASKETBALL_PLAYERS) {
    if (playerName.includes(player) || description.includes(player)) {
      return 'Basketball';
    }
  }

  // Football - Player detection
  for (const player of FOOTBALL_PLAYERS) {
    if (playerName.includes(player) || description.includes(player)) {
      return 'Football';
    }
  }

  // Baseball - Player detection
  for (const player of BASEBALL_PLAYERS) {
    if (playerName.includes(player) || description.includes(player)) {
      return 'Baseball';
    }
  }

  // Hockey - Player detection
  for (const player of HOCKEY_PLAYERS) {
    if (playerName.includes(player) || description.includes(player)) {
      return 'Hockey';
    }
  }

  // Basketball - Team detection
  for (const teamName of BASKETBALL_TEAMS) {
    if (team.includes(teamName) || description.includes(teamName)) {
      return 'Basketball';
    }
  }

  // Football - Team detection
  for (const teamName of FOOTBALL_TEAMS) {
    if (team.includes(teamName) || description.includes(teamName)) {
      return 'Football';
    }
  }

  // Baseball - Team detection
  for (const teamName of BASEBALL_TEAMS) {
    if (team.includes(teamName) || description.includes(teamName)) {
      return 'Baseball';
    }
  }

  // Hockey - Team detection
  for (const teamName of HOCKEY_TEAMS) {
    if (team.includes(teamName) || description.includes(teamName)) {
      return 'Hockey';
    }
  }

  // College sports
  if (combined.match(/college|ncaa|university/)) {
    return 'College';
  }

  // WNBA
  if (combined.match(/wnba|caitlin clark|angel reese|sabrina ionescu|paige bueckers/)) {
    return 'WNBA';
  }

  // Default to Other if can't detect
  return 'Other';
}

module.exports = {
  detectSport
};
