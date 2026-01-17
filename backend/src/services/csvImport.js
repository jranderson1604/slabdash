const { parse } = require("csv-parse/sync");
const db = require("../db");

/**
 * Parse PSA CSV file - supports two formats:
 * 1. Detailed format: Order #, Service Level, Cert #, Year, Brand, Card #, Player, Variety/Pedigree, Grade, Qualifier
 * 2. PSA export format: Cert #, Type, Description, Grade, After Service, Images
 */
function parsePSACSV(csvContent) {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
      bom: true  // Handle UTF-8 BOM that Excel adds to CSV files
    });

    if (records.length === 0) {
      return [];
    }

    // Detect CSV format by checking column names
    const firstRecord = records[0];
    const hasDetailedFormat = firstRecord["Order #"] || firstRecord["Order Number"];
    const hasPSAFormat = firstRecord["Cert #"] && firstRecord["Description"];

    if (hasPSAFormat && !hasDetailedFormat) {
      return parsePSAExportFormat(records);
    } else {
      return parseDetailedFormat(records);
    }
  } catch (err) {
    console.error("CSV Parse Error:", err);
    throw new Error(`Failed to parse CSV: ${err.message}`);
  }
}

/**
 * Parse PSA export format: Cert #, Type, Description, Grade, After Service, Images
 */
function parsePSAExportFormat(records) {
  // Create a single submission for all cards in this import
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const submissionNumber = `PSA-IMPORT-${timestamp}-${Date.now().toString().slice(-6)}`;

  const cards = [];

  records.forEach((record, index) => {
    const certNumber = record["Cert #"];
    if (!certNumber) {
      console.warn(`Row ${index + 1}: No cert number found, skipping`);
      return;
    }

    // Parse the description field to extract what we can
    const description = record["Description"] || "Imported Card";
    const parsed = parseCardDescription(description);

    const card = {
      psa_cert_number: certNumber,
      year: parsed.year,
      brand: parsed.brand,
      card_number: parsed.cardNumber,
      player_name: parsed.player,
      variation: parsed.variation,
      grade: record["Grade"] || null,
      qualifier: null,
      description: description,
      status: record["After Service"] || null,
      image_url: record["Images"] || null
    };

    cards.push(card);
  });

  return [{
    psa_submission_number: submissionNumber,
    service_level: null,
    cards: cards
  }];
}

/**
 * Parse PSA description to extract year, brand, player, etc.
 * Example: "2024 PANINI DONRUSS DOWNTOWN! 13 DRAKE MAYE"
 * Format: YEAR BRAND SET CARDNUMBER PLAYER_NAME
 */
function parseCardDescription(description) {
  const result = {
    year: null,
    brand: null,
    player: null,
    variation: null,
    cardNumber: null
  };

  if (!description) return result;

  // Extract year (first 4 digits)
  const yearMatch = description.match(/^(\d{4})\s+/);
  if (yearMatch) {
    result.year = yearMatch[1];
    description = description.substring(yearMatch[0].length); // Remove year
  }

  // Common brands to detect
  const brands = ['PANINI', 'TOPPS', 'BOWMAN', 'DONRUSS', 'UPPER DECK', 'FLEER', 'PRIZM', 'CHROME', 'OPTIC', 'SELECT', 'LEAF'];
  const descUpper = description.toUpperCase();

  let brandFound = null;
  let brandIndex = -1;
  for (const brand of brands) {
    const idx = descUpper.indexOf(brand);
    if (idx !== -1) {
      brandFound = brand;
      brandIndex = idx;
      break;
    }
  }

  if (brandFound) {
    // Extract everything from brand to end of set name (usually ends before card number or player name)
    // Pattern: brand might be followed by set name, then card number, then player
    const afterBrand = description.substring(brandIndex);

    // Try to find player name (usually at the end, capitalized words)
    // Pattern: "PANINI DONRUSS DOWNTOWN! 13 DRAKE MAYE"
    // Split by spaces and find capitalized proper names at the end
    const parts = afterBrand.split(/\s+/);

    // Player name is usually the last 2-3 capitalized words
    const playerParts = [];
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      // Stop if we hit a number or special chars (likely card number or set name)
      if (/^\d+$/.test(part) || /[!#]/.test(part)) break;
      // Collect capitalized words (likely player name)
      if (/^[A-Z][A-Z]*$/.test(part)) {
        playerParts.unshift(part);
      } else {
        break;
      }
    }

    if (playerParts.length > 0) {
      result.player = playerParts.join(' ');
    }

    // Card set is from brand to before player name
    const playerName = result.player || '';
    const setEndIndex = playerName ? afterBrand.lastIndexOf(playerName) : afterBrand.length;
    result.brand = afterBrand.substring(0, setEndIndex).trim();
  } else {
    // No brand found, use whole description as brand
    result.brand = description.trim();
  }

  return result;
}

/**
 * Parse detailed format: Order #, Service Level, Cert #, Year, Brand, Card #, Player, etc.
 */
function parseDetailedFormat(records) {
  const submissions = {};

  records.forEach((record, index) => {
    // Extract submission number (could be in different column names)
    const submissionNumber =
      record["Order #"] ||
      record["Order Number"] ||
      record["Submission #"] ||
      record["Submission Number"] ||
      record["PSA Submission #"];

    if (!submissionNumber) {
      console.warn(`Row ${index + 1}: No submission number found, skipping`);
      return;
    }

    // Initialize submission group if not exists
    if (!submissions[submissionNumber]) {
      submissions[submissionNumber] = {
        psa_submission_number: submissionNumber,
        service_level: record["Service Level"] || record["Service"] || null,
        cards: []
      };
    }

    // Extract card data
    const card = {
      psa_cert_number: record["Cert #"] || record["Cert Number"] || record["Certificate #"] || null,
      year: record["Year"] || null,
      brand: record["Brand"] || record["Set"] || null,
      card_number: record["Card #"] || record["Card Number"] || null,
      player_name: record["Player"] || record["Subject"] || null,
      variation: record["Variety/Pedigree"] || record["Variety"] || record["Pedigree"] || null,
      grade: record["Grade"] || null,
      qualifier: record["Qualifier"] || null,
      description: buildCardDescription(record)
    };

    submissions[submissionNumber].cards.push(card);
  });

  return Object.values(submissions);
}

/**
 * Build a card description from detailed CSV record
 */
function buildCardDescription(record) {
  const parts = [];

  if (record["Year"]) parts.push(record["Year"]);
  if (record["Brand"]) parts.push(record["Brand"]);
  if (record["Card #"] || record["Card Number"]) parts.push(`#${record["Card #"] || record["Card Number"]}`);
  if (record["Player"] || record["Subject"]) parts.push(record["Player"] || record["Subject"]);
  if (record["Variety/Pedigree"] || record["Variety"]) {
    parts.push(`(${record["Variety/Pedigree"] || record["Variety"]})`);
  }

  return parts.length > 0 ? parts.join(" ") : "Imported Card";
}

/**
 * Import submissions and cards into database
 * @param {string} csvContent - CSV file content
 * @param {string} companyId - Company UUID
 * @param {string} userId - User ID (admin user or customer) to assign submissions to
 */
async function importSubmissionsFromCSV(csvContent, companyId, userId = null) {
  const submissions = parsePSACSV(csvContent);
  const results = {
    success: true,
    submissionsCreated: 0,
    submissionsUpdated: 0,
    cardsCreated: 0,
    errors: []
  };

  for (const submissionData of submissions) {
    try {
      // Check if submission already exists
      const existingSubmission = await db.query(
        `SELECT id FROM submissions
         WHERE company_id = $1 AND psa_submission_number = $2`,
        [companyId, submissionData.psa_submission_number]
      );

      let submissionId;

      if (existingSubmission.rows.length > 0) {
        // Update existing submission
        submissionId = existingSubmission.rows[0].id;
        await db.query(
          `UPDATE submissions
           SET service_level = COALESCE($1, service_level)
           WHERE id = $2`,
          [submissionData.service_level, submissionId]
        );
        results.submissionsUpdated++;
      } else {
        // Create new submission
        const newSubmission = await db.query(
          `INSERT INTO submissions (
            company_id, user_id, psa_submission_number, service_level
          ) VALUES ($1, $2, $3, $4)
          RETURNING id`,
          [companyId, userId, submissionData.psa_submission_number, submissionData.service_level]
        );
        submissionId = newSubmission.rows[0].id;
        results.submissionsCreated++;
      }

      // Import cards
      for (const cardData of submissionData.cards) {
        try {
          // Check if card with same cert number already exists
          if (cardData.psa_cert_number) {
            const existingCard = await db.query(
              `SELECT id FROM cards
               WHERE psa_cert_number = $1`,
              [cardData.psa_cert_number]
            );

            if (existingCard.rows.length > 0) {
              // Update existing card with new data
              await db.query(
                `UPDATE cards
                 SET year = COALESCE($1, year),
                     player_name = COALESCE($2, player_name),
                     card_set = COALESCE($3, card_set),
                     grade = COALESCE($4, grade),
                     submission_id = $5
                 WHERE id = $6`,
                [
                  cardData.year,
                  cardData.player_name || cardData.description || 'Unknown Player',
                  cardData.brand || 'Unknown',
                  cardData.grade,
                  submissionId,
                  existingCard.rows[0].id
                ]
              );
              continue;
            }
          }

          // Create new card - match EXACT format from server.js that works in production
          await db.query(
            `INSERT INTO cards (
              submission_id, year, player_name, card_set, grade, psa_cert_number
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              submissionId,
              cardData.year,
              cardData.player_name || cardData.description || 'Unknown Player',
              cardData.brand || 'Unknown',
              cardData.grade,
              cardData.psa_cert_number
            ]
          );
          results.cardsCreated++;
        } catch (cardErr) {
          console.error(`Error importing card:`, cardErr);
          results.errors.push({
            submission: submissionData.psa_submission_number,
            card: cardData.description,
            error: cardErr.message
          });
        }
      }
    } catch (submissionErr) {
      console.error(`Error importing submission ${submissionData.psa_submission_number}:`, submissionErr);
      results.errors.push({
        submission: submissionData.psa_submission_number,
        error: submissionErr.message
      });
    }
  }

  return results;
}

module.exports = {
  parsePSACSV,
  importSubmissionsFromCSV
};
