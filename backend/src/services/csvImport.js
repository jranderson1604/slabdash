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
 * Parse card description to extract year, brand, player, etc.
 * Example: "2024 PANINI NEAR MINT" or "2018 Topps Chrome Mike Trout Refractor"
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

  // Try to extract year (4 digits at start or in string)
  const yearMatch = description.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    result.year = yearMatch[0];
  }

  // Common card brands
  const brands = ['TOPPS', 'PANINI', 'BOWMAN', 'DONRUSS', 'UPPER DECK', 'FLEER', 'PRIZM', 'CHROME', 'OPTIC', 'SELECT'];
  const descUpper = description.toUpperCase();

  for (const brand of brands) {
    if (descUpper.includes(brand)) {
      result.brand = brand.charAt(0) + brand.slice(1).toLowerCase();
      break;
    }
  }

  // Try to extract card number (like #1, #123, #RC1, etc.)
  const cardNumMatch = description.match(/#(\w+)/);
  if (cardNumMatch) {
    result.cardNumber = cardNumMatch[1];
  }

  // Store remaining as variation/notes
  result.variation = description;

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
 */
async function importSubmissionsFromCSV(csvContent, companyId, customerId = null) {
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
           SET service_level = COALESCE($1, service_level),
               updated_at = NOW()
           WHERE id = $2`,
          [submissionData.service_level, submissionId]
        );
        results.submissionsUpdated++;
      } else {
        // Create new submission
        const newSubmission = await db.query(
          `INSERT INTO submissions (
            company_id, customer_id, psa_submission_number, service_level
          ) VALUES ($1, $2, $3, $4)
          RETURNING id`,
          [companyId, customerId, submissionData.psa_submission_number, submissionData.service_level]
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
               WHERE company_id = $1 AND psa_cert_number = $2`,
              [companyId, cardData.psa_cert_number]
            );

            if (existingCard.rows.length > 0) {
              // Update existing card
              await db.query(
                `UPDATE cards
                 SET year = COALESCE($1, year),
                     brand = COALESCE($2, brand),
                     card_number = COALESCE($3, card_number),
                     player_name = COALESCE($4, player_name),
                     variation = COALESCE($5, variation),
                     grade = COALESCE($6, grade),
                     qualifier = COALESCE($7, qualifier),
                     submission_id = $8,
                     updated_at = NOW()
                 WHERE id = $9`,
                [
                  cardData.year,
                  cardData.brand,
                  cardData.card_number,
                  cardData.player_name,
                  cardData.variation,
                  cardData.grade,
                  cardData.qualifier,
                  submissionId,
                  existingCard.rows[0].id
                ]
              );
              continue;
            }
          }

          // Create new card
          await db.query(
            `INSERT INTO cards (
              company_id, submission_id, customer_id, description,
              year, brand, card_number, player_name, variation,
              psa_cert_number, grade, qualifier, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              companyId,
              submissionId,
              customerId,
              cardData.description,
              cardData.year,
              cardData.brand,
              cardData.card_number,
              cardData.player_name,
              cardData.variation,
              cardData.psa_cert_number,
              cardData.grade,
              cardData.qualifier,
              cardData.grade ? "graded" : "pending"
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
