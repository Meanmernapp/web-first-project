require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const csvParser = require('csv-parser');
const { MongoClient } = require('mongodb');
const chokidar = require('chokidar');
const moment = require('moment');
const crypto = require('crypto');

const app = express();
const port = 3050;

// Load environment variables
const dbConnectionUrl = process.env.DB_CONNECTION_URL;
const dbName = process.env.DB_NAME;

// Path to the Data folder
const dataFolderPath = path.join(__dirname, 'Data');

// Function to ensure folder exists
function ensureFolderExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath);
  }
}

// Ensure Data folder exists
ensureFolderExists(dataFolderPath);

// Function to convert date from CSV to ISODate
function convertDate(dateStr) {
  if (!dateStr) return null;
  return moment(dateStr, 'MM/DD/YYYY').isValid() ? moment(dateStr, 'MM/DD/YYYY').toDate() : null;
}

// Function to log import activity
async function logImport(db, folderName, startTime, endTime) {
  const importLogsCollection = db.collection('importLogs');
  await importLogsCollection.insertOne({
    folderName,
    startTime,
    endTime,
  });
}

// Function to calculate the hash of a file
function calculateFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// Function to check if a file has been processed
async function isFileProcessed(db, fileHash) {
  const processedFilesCollection = db.collection('processedFiles');
  const file = await processedFilesCollection.findOne({ hash: fileHash });
  return file !== null;
}

// Function to mark a file as processed
async function markFileAsProcessed(db, fileHash) {
  const processedFilesCollection = db.collection('processedFiles');
  try {
    await processedFilesCollection.insertOne({ hash: fileHash });
  } catch (err) {
    if (err.code === 11000) {
      console.log(`File with hash ${fileHash} is already marked as processed.`);
    } else {
      throw err;
    }
  }
}

// Import Users from WEBFIRST_EMPLOYEES.csv
async function importUsers(db, userCsvPath) {
  const usersCollection = db.collection('users');
  console.log(`Importing users from ${userCsvPath}`);

  if (fs.existsSync(userCsvPath)) {
    const users = [];

    fs.createReadStream(userCsvPath)
      .pipe(csvParser())
      .on('data', (row) => {
        users.push({
          updateOne: {
            filter: { username: row['User'] },
            update: {
              $set: {
                firstName: row['First name'],
                lastName: row['Last name'],
                employeeType: row['Employee Type'],
                title: row['Title'],
                supervisor: row['Supervisor'],
                status: row['Status'],       // Added status field
                email: row['Email'],         // Added email field
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            },
            upsert: true,
          },
        });
      })
      .on('end', async () => {
        if (users.length > 0) {
          try {
            await usersCollection.bulkWrite(users);
            console.log('Users imported successfully.');
          } catch (err) {
            console.error('Error during user import:', err);
          }
        }
      });
  } else {
    console.log(`User file ${userCsvPath} does not exist.`);
  }
}

// Import Time Entries and Project details from project CSV files
async function importProjectData(db, csvPath, projectName) {
  const projectsCollection = db.collection('projects');
  const timeEntriesCollection = db.collection('timeEntries');
  console.log(`Importing project data from ${csvPath}`);

  const projectUpdates = [];
  const timeEntries = [];

  fs.createReadStream(csvPath)
    .pipe(csvParser())
    .on('data', (row) => {
      const updateProjectData = {
        updatedAt: new Date(),
      };

      if (row['Period Of Performance']) {
        const [startDateStr, endDateStr] = row['Period Of Performance'].split(' to ');
        const startDate = moment(startDateStr, 'DD-MMM-YYYY').isValid() ? moment(startDateStr, 'DD-MMM-YYYY').toDate() : null;
        const endDate = moment(endDateStr, 'DD-MMM-YYYY').isValid() ? moment(endDateStr, 'DD-MMM-YYYY').toDate() : null;
        updateProjectData.periodOfPerformance = { startDate, endDate };
      }

      if (row['Status']) updateProjectData.status = row['Status'];
      if (row['Contract Type']) updateProjectData.contractType = row['Contract Type'];
      if (row['Budget Hours']) updateProjectData.budgetHours = parseInt(row['Budget Hours']);
      if (row['Description']) updateProjectData.description = row['Description'];
      if (row['PM']) updateProjectData.pm = row['PM']; 

      projectUpdates.push({
        updateOne: {
          filter: { name: projectName },
          update: {
            $set: updateProjectData,
            $setOnInsert: {
              name: projectName,
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      });

      timeEntries.push({
        username: row['User'],
        projectName,
        date: convertDate(row['Date']),
        hours: parseFloat(row['Time (decimal)']),
        description: row['Description'],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    })
    .on('end', async () => {
      if (projectUpdates.length > 0) {
        try {
          await projectsCollection.bulkWrite(projectUpdates);
          console.log(`Projects for ${projectName} imported/updated successfully`);
        } catch (err) {
          console.error(`Error during project import for ${projectName}:`, err);
        }
      }

      if (timeEntries.length > 0) {
        try {
          await timeEntriesCollection.insertMany(timeEntries);
          console.log(`Time entries for ${projectName} imported successfully`);
        } catch (err) {
          console.error(`Error during time entry import for ${projectName}:`, err);
        }
      }
    });
}

// Import Summary Data from WEBFIRST_SUMMARY.csv
async function importSummaryData(db, csvPath, folderName) {
  const summaryCollection = db.collection('summary');
  console.log(`Importing summary data from ${csvPath}`);

  const [year, month] = folderName.split('_').slice(0, 2);
  const monthName = `${year}_${month}`;

  const summaries = [];

  fs.createReadStream(csvPath)
    .pipe(csvParser())
    .on('data', (row) => {
      summaries.push({
        username: row['User'],
        time: parseFloat(row['Time (decimal)']),
        timeOff: parseFloat(row['Time Off (decimal)']),
        month: monthName,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    })
    .on('end', async () => {
      if (summaries.length > 0) {
        const bulkOps = summaries.map(summary => ({
          updateOne: {
            filter: { username: summary.username, month: summary.month },
            update: { 
              $inc: { time: summary.time, timeOff: summary.timeOff },
              $setOnInsert: { createdAt: summary.createdAt, updatedAt: summary.updatedAt } 
            },
            upsert: true
          }
        }));

        try {
          await summaryCollection.bulkWrite(bulkOps);
          console.log(`Summary data for ${monthName} imported successfully.`);
        } catch (err) {
          console.error(`Error during summary import for ${monthName}:`, err);
        }
      }
    });
}

// Import data from a specific folder
async function importFolder(db, folder, folderPath) {
  const userCsvPath = path.join(folderPath, 'WEBFIRST_EMPLOYEES.csv');
  await importUsers(db, userCsvPath);

  // Import project data for each project CSV file in the current folder
  fs.readdir(folderPath, (err, files) => {
    if (err) throw err;

    files.forEach(async (file) => {
      if (file.endsWith('.csv')) {
        const filePath = path.join(folderPath, file);
        const fileHash = await calculateFileHash(filePath);

        if (await isFileProcessed(db, fileHash)) {
          console.log(`File ${filePath} has already been processed.`);
          return;
        }

        if (file === 'WEBFIRST_EMPLOYEES.csv') {
          // Skip user CSV file
          return;
        } else if (file === 'WEBFIRST_SUMMARY.csv') {
          // Import summary data
          await importSummaryData(db, filePath, folder);
        } else {
          // Import project data
          const projectName = file.split('.')[0]; // Extract project name from the file name
          await importProjectData(db, filePath, projectName);
        }

        // Mark file as processed
        await markFileAsProcessed(db, fileHash);
      }
    });
  });
}

// Main function to import all data
async function importData(client) {
  try {
    const db = client.db(dbName);

    // Ensure unique index on project name
    await db.collection('projects').createIndex({ name: 1 }, { unique: true });
    // Ensure unique index on username
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    // Ensure index on month for summary collection
    await db.collection('summary').createIndex({ month: 1, username: 1 }, { unique: true });
    // Ensure unique index on hash for processedFiles collection
    await db.collection('processedFiles').createIndex({ hash: 1 }, { unique: true });

    // Import data for each subfolder in the Data folder
    fs.readdir(dataFolderPath, (err, folders) => {
      if (err) throw err;

      folders.forEach(async (folder) => {
        const folderPath = path.join(dataFolderPath, folder);
        if (fs.lstatSync(folderPath).isDirectory()) {
          const startTime = new Date();
          await importFolder(db, folder, folderPath);
          const endTime = new Date();
          await logImport(db, folder, startTime, endTime);
        }
      });
    });
  } catch (err) {
    console.error('Error during MongoDB operation:', err);
  }
}

// Start the initial import process
async function startInitialImport(client) {
  console.log('Starting import for new files...');
  await importData(client);
  console.log('Import for new files completed.');
}

// Watcher function to monitor the Data folder
function startWatching(client) {
  const watcher = chokidar.watch(dataFolderPath, {
    persistent: true,
    ignoreInitial: true, // Ignore initial add events when starting the watcher
  });

  let timer;
  let newFiles = [];

  watcher.on('add', (filePath) => {
    console.log(`File ${filePath} has been added`);
    newFiles.push(filePath);

    clearTimeout(timer);
    timer = setTimeout(() => {
      startInitialImport(client);
      newFiles = [];
    }, 40000);
  });
}

// Start the Express server
app.listen(port, async () => {
  console.log(`Server is running at http://localhost:${port}`);
  
  const client = new MongoClient(dbConnectionUrl);

  try {
    await client.connect();
    console.log('Successfully connected to MongoDB');

    startWatching(client); // Start watching for new files

  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
  }
});
