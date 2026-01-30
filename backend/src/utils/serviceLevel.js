/**
 * Normalize service level names from PSA API and CSV imports
 * Examples:
 * - "Value Plus 25" -> "Value Plus"
 * - "Express 10" -> "Express"
 * - "Super Express 5" -> "Super Express"
 * - "Value Bulk 50" -> "Value Bulk"
 */
function normalizeServiceLevel(serviceLevel) {
  if (!serviceLevel || typeof serviceLevel !== 'string') {
    return serviceLevel;
  }

  const trimmed = serviceLevel.trim();

  // List of known service level names (in order of priority)
  const serviceLevels = [
    'Value Bulk',
    'Bulk',
    'Value Plus',
    'Plus',
    'Standard',
    'Regular',
    'Super Express',
    'Express',
    'Walk-Through',
    'Walk-Thru',
    'Specialty',
    'Reholder'
  ];

  // Check if the service level starts with any known service level name
  for (const level of serviceLevels) {
    if (trimmed.toLowerCase().startsWith(level.toLowerCase())) {
      // Return the canonical name (preserves casing)
      return level;
    }
  }

  // If no match found, try to remove trailing numbers and extra text
  // Pattern: "Express 10" or "Value Plus 25" etc.
  const match = trimmed.match(/^([A-Za-z\s-]+?)(\s+\d+.*)?$/);
  if (match) {
    return match[1].trim();
  }

  // Return as-is if no normalization applies
  return trimmed;
}

module.exports = {
  normalizeServiceLevel
};
