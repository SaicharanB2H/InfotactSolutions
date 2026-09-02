import fs from 'fs';
import path from 'path';

const targetRows = parseInt(process.argv[2] || '100000', 10);
const outputPath = path.resolve(process.argv[3] || './sample-data/large-dataset.csv');

const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const writeStream = fs.createWriteStream(outputPath, { encoding: 'utf8' });

console.log(`🚀 Starting streaming generation of ${targetRows.toLocaleString()} CSV rows at ${outputPath}...`);

const startTime = Date.now();
let i = 0;

// Header
writeStream.write('Column A,Column B,Column C,age\n');

function writeNextChunk() {
  let ok = true;
  while (i < targetRows && ok) {
    i++;
    const name = `user_${i}`;
    const email = `user${i}@example.com`;
    const city = `City_${i % 100}`;
    const age = 18 + (i % 60);

    const row = `${name},${email},${city},${age}\n`;
    ok = writeStream.write(row);
  }

  if (i < targetRows) {
    // Backpressure: wait for drain event before continuing writes
    writeStream.once('drain', writeNextChunk);
  } else {
    writeStream.end();
  }
}

writeStream.on('finish', () => {
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const stats = fs.statSync(outputPath);
  const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Generated ${targetRows.toLocaleString()} rows (${sizeMb} MB) in ${duration} seconds.`);
});

writeStream.on('error', (err) => {
  console.error('❌ Error generating CSV:', err);
});

writeNextChunk();
