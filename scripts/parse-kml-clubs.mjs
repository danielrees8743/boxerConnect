/**
 * Script to parse Welsh Boxing clubs from KML file
 * and output structured JSON data
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseDescription(description) {
  // Clean up HTML entities and tags
  let text = description
    .replace(/<br>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .trim();

  // Extract email
  const emailMatch = text.match(/Email:\s*([^\s\n]+@[^\s\n]+)/i);
  let email = emailMatch ? emailMatch[1].trim() : null;

  // Clean up email (remove trailing spaces, non-email characters)
  if (email) {
    email = email.replace(/\s+/g, '').replace(/[<>]/g, '');
    // Validate email format
    if (!email.includes('@') || !email.includes('.')) {
      email = null;
    }
  }

  // Extract phone (Mobile or landline)
  const phoneMatch = text.match(/(?:Mobile|Phone|Tel):\s*([\d\s]+)/i);
  let phone = phoneMatch ? phoneMatch[1].replace(/\s+/g, ' ').trim() : null;

  // Extract main contact name
  const contactMatch = text.match(/Main Contact:\s*([^\n]+)/i);
  let contactName = contactMatch ? contactMatch[1].trim() : null;

  // Extract postcode (UK format)
  const postcodeMatch = text.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})/i);
  let postcode = postcodeMatch ? postcodeMatch[1].toUpperCase().replace(/\s+/g, ' ') : null;

  return { email, phone, contactName, postcode };
}

function parseKML(kmlContent) {
  const clubs = [];

  // Find all Folder elements (divisions)
  const folderRegex = /<Folder>\s*<name>([^<]+)<\/name>([\s\S]*?)<\/Folder>/g;
  let folderMatch;

  while ((folderMatch = folderRegex.exec(kmlContent)) !== null) {
    const regionName = folderMatch[1].trim();
    const folderContent = folderMatch[2];

    // Find all Placemark elements within this folder
    const placemarkRegex = /<Placemark>([\s\S]*?)<\/Placemark>/g;
    let placemarkMatch;

    while ((placemarkMatch = placemarkRegex.exec(folderContent)) !== null) {
      const placemarkContent = placemarkMatch[1];

      // Extract name
      const nameMatch = placemarkContent.match(/<name>(?:<!\[CDATA\[)?([^\]<]+?)(?:\]\]>)?<\/name>/);
      const name = nameMatch ? nameMatch[1].trim().replace(/\n/g, ' ') : 'Unknown';

      // Extract description
      const descMatch = placemarkContent.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
      const description = descMatch ? descMatch[1] : '';

      // Extract coordinates
      const coordMatch = placemarkContent.match(/<coordinates>\s*([-\d.]+),([-\d.]+),/);
      const longitude = coordMatch ? parseFloat(coordMatch[1]) : null;
      const latitude = coordMatch ? parseFloat(coordMatch[2]) : null;

      // Parse description for details
      const { email, phone, contactName, postcode } = parseDescription(description);

      clubs.push({
        name,
        email,
        phone,
        contactName,
        postcode,
        region: regionName,
        latitude,
        longitude,
      });
    }
  }

  return clubs;
}

// Main execution
const kmlPath = path.join(__dirname, '..', 'welsh-boxing-clubs.kml');
const outputPath = path.join(__dirname, '..', 'welsh-boxing-clubs.json');

console.log('Reading KML file...');
const kmlContent = fs.readFileSync(kmlPath, 'utf-8');

console.log('Parsing clubs...');
const clubs = parseKML(kmlContent);

console.log(`\nFound ${clubs.length} clubs total\n`);

// Count by region
const regionCounts = {};
clubs.forEach(club => {
  regionCounts[club.region] = (regionCounts[club.region] || 0) + 1;
});

console.log('Clubs by region:');
Object.entries(regionCounts).forEach(([region, count]) => {
  console.log(`  ${region}: ${count}`);
});

// Count with emails
const clubsWithEmail = clubs.filter(c => c.email);
console.log(`\nClubs with email: ${clubsWithEmail.length}/${clubs.length}`);

// Show sample
console.log('\n=== SAMPLE DATA (First 5 clubs) ===\n');
clubs.slice(0, 5).forEach((club, i) => {
  console.log(`${i + 1}. ${club.name}`);
  console.log(`   Region: ${club.region}`);
  console.log(`   Email: ${club.email || 'N/A'}`);
  console.log(`   Phone: ${club.phone || 'N/A'}`);
  console.log(`   Contact: ${club.contactName || 'N/A'}`);
  console.log(`   Postcode: ${club.postcode || 'N/A'}`);
  console.log(`   Location: ${club.latitude}, ${club.longitude}`);
  console.log();
});

// Save to JSON
fs.writeFileSync(outputPath, JSON.stringify(clubs, null, 2));
console.log(`\nSaved ${clubs.length} clubs to ${outputPath}`);
