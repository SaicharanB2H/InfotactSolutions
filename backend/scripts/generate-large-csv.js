const fs = require('fs');
const path = require('path');

const sizeArg = process.argv[2] || '100MB';
const outputPath = process.argv[3] || path.join(__dirname, '../large-dataset.csv');

function parseSize(sizeStr) {
  const match = String(sizeStr).trim().toUpperCase().match(/^(\d+)\s*(GB|MB|KB|B)?$/);
  if (!match) return 100 * 1024 * 1024; // Default 100MB
  
  const val = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 'GB': return val * 1024 * 1024 * 1024;
    case 'MB': return val * 1024 * 1024;
    case 'KB': return val * 1024;
    default: return val;
  }
}

const targetSizeBytes = parseSize(sizeArg);
const parentDir = path.dirname(outputPath);

if (!fs.existsSync(parentDir)) {
  fs.mkdirSync(parentDir, { recursive: true });
}

console.log(`Generating synthetic CSV file...`);
console.log(`Target Size : ${sizeArg} (${targetSizeBytes.toLocaleString()} bytes)`);
console.log(`Output Path : ${outputPath}`);

const writeStream = fs.createWriteStream(outputPath);

// Write header
writeStream.write('Column A,Column B,Column C\n');
let bytesWritten = writeStream.bytesWritten;
let rowIndex = 0;

function write() {
  let ok = true;
  
  // Write rows in a loop until buffer is full or size is reached
  while (ok && bytesWritten < targetSizeBytes) {
    rowIndex++;
    
    // Column A: username, Column B: email, Column C: age
    const row = `User-${rowIndex},user-${rowIndex}@example.com,${Math.floor(Math.random() * 63) + 18}\n`;
    ok = writeStream.write(row);
    bytesWritten += Buffer.byteLength(row, 'utf8');
  }

  if (bytesWritten < targetSizeBytes) {
    // Buffer is full. Wait for 'drain' event to resume writing.
    writeStream.once('drain', write);
  } else {
    // Reached target size, close stream
    writeStream.end();
    console.log(`Generation completed successfully!`);
    console.log(`Total Rows  : ${rowIndex.toLocaleString()}`);
    console.log(`Total Bytes : ${bytesWritten.toLocaleString()} bytes`);
  }
}

writeStream.on('error', (err) => {
  console.error('Error generating CSV file:', err);
});

write();
