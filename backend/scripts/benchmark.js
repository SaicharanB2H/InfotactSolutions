const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

// Load environment variables directly
const config = require('../src/config/env');
const { connectDatabase } = require('../src/config/database');
const Pipeline = require('../src/models/pipeline.model');
const Job = require('../src/models/job.model');
const { runEtlJob } = require('../src/services/etl.service');

const csvPath = process.argv[2] || path.join(__dirname, '../large-dataset.csv');

async function runBenchmark() {
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found at ${csvPath}`);
    console.error('Please generate one first using the CSV generator script:');
    console.error('node scripts/generate-large-csv.js 100MB');
    process.exit(1);
  }

  const fileStats = fs.statSync(csvPath);
  const fileSizeMb = (fileStats.size / 1024 / 1024).toFixed(2);

  console.log('Connecting to database...');
  await connectDatabase();

  console.log('Cleaning existing metadata...');
  await Pipeline.deleteMany({});
  await Job.deleteMany({});

  console.log('Creating benchmark pipeline configuration...');
  const pipeline = new Pipeline({
    name: 'Benchmark Visual Mapping',
    mappings: [
      { source: 'Column A', destination: 'username' },
      { source: 'Column B', destination: 'email' },
      { source: 'Column C', destination: 'age' }
    ],
    transformations: [
      { field: 'username', code: 'return value.trim().toUpperCase();' }
    ],
    validationRules: [
      { field: 'username', required: true, type: 'string' },
      { field: 'email', required: true, type: 'string', regex: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' },
      { field: 'age', required: true, type: 'number', min: 18, max: 100 }
    ]
  });
  await pipeline.save();

  // Create temporary copy of the file since runEtlJob deletes the source file in its finally block!
  const uniqueId = new mongoose.Types.ObjectId();
  const benchmarkTempFile = path.join(__dirname, `../uploads/benchmark-temp-${uniqueId}.csv`);
  
  const uploadsDir = path.dirname(benchmarkTempFile);
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  console.log(`Copying source CSV to temp upload folder for processing...`);
  fs.copyFileSync(csvPath, benchmarkTempFile);

  const job = new Job({
    _id: uniqueId,
    status: 'pending',
    fileName: path.basename(csvPath),
    pipelineId: pipeline._id
  });
  await job.save();

  console.log(`Starting benchmark for Job ${job._id}...`);
  console.log(`File Size: ${fileSizeMb} MB`);

  let peakRss = 0;
  let peakHeap = 0;

  // Sample memory usage every 50 milliseconds
  const memTracker = setInterval(() => {
    const memory = process.memoryUsage();
    if (memory.rss > peakRss) peakRss = memory.rss;
    if (memory.heapUsed > peakHeap) peakHeap = memory.heapUsed;
  }, 50);

  const startTime = Date.now();

  try {
    await runEtlJob(job._id, pipeline._id, benchmarkTempFile, fileStats.size);

    // Poll the Job in the database until processing is finished
    let completedJob = null;
    while (true) {
      completedJob = await Job.findById(job._id);
      if (completedJob && ['completed', 'failed', 'cancelled'].includes(completedJob.status)) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    const elapsedSeconds = (Date.now() - startTime) / 1000;
    clearInterval(memTracker);

    const totalProcessed = completedJob.processedRows + completedJob.failedRows;
    const batchSize = config.BULK_BATCH_SIZE || 5000;

    console.log('\n================== BENCHMARK PROFILE REPORT ==================');
    console.log(`Source File       : ${csvPath}`);
    console.log(`File Size         : ${fileSizeMb} MB`);
    console.log(`Total Rows        : ${totalProcessed.toLocaleString()}`);
    console.log(`Processing Time   : ${elapsedSeconds.toFixed(2)} seconds`);
    console.log(`Throughput Rate   : ${Math.round(totalProcessed / elapsedSeconds).toLocaleString()} rows/sec`);
    console.log(`Peak RSS Memory   : ${(peakRss / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Peak Heap Used    : ${(peakHeap / 1024 / 1024).toFixed(2)} MB`);
    console.log(`Success Writes    : ${completedJob.processedRows.toLocaleString()}`);
    console.log(`Failed Rows       : ${completedJob.failedRows.toLocaleString()}`);
    console.log(`MongoDB Batches   : ${Math.ceil(completedJob.processedRows / batchSize).toLocaleString()}`);
    console.log(`Job Status        : ${completedJob.status}`);
    if (completedJob.error) {
      console.log(`Job Error         : ${completedJob.error}`);
    }
    console.log('==============================================================\n');

  } catch (error) {
    console.error('Benchmark execution failed:', error);
  } finally {
    clearInterval(memTracker);
    
    // Clean up dynamic collection
    const dynamicCollName = `pipeline_data_${pipeline._id}`;
    console.log(`Cleaning benchmark collection '${dynamicCollName}'...`);
    await mongoose.connection.db.dropCollection(dynamicCollName).catch(() => {});
    
    console.log('Closing database connection...');
    await mongoose.connection.close();
    process.exit(0);
  }
}

runBenchmark();
