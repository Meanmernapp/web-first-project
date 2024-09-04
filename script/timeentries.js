require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const csvParser = require("csv-parser");
const { MongoClient } = require("mongodb");
const chokidar = require("chokidar");
const moment = require("moment");

const app = express();
const port = 3050;

// Load environment variables
const dbConnectionUrl = process.env.DB_CONNECTION_URL;
const dbName = process.env.DB_NAME;

// Path to the Data folder
const dataFolderPath = path.join(__dirname, "Data");

// Ensure Data folder exists
if (!fs.existsSync(dataFolderPath)) {
  fs.mkdirSync(dataFolderPath);
}

// Function to calculate the last Friday date
function getLastFriday() {
  const today = moment().startOf("day");
  const lastFriday =
    today.day() < 5 ? today.subtract(1, "week").day(5) : today.day(5);
  return lastFriday;
}

// Function to calculate two months back from today
function getTwoMonthsBack() {
  return moment().subtract(2, "months").startOf("day");
}
// Function to archive and delete old time entries
async function archiveAndDeleteOldTimeEntries(db) {
  const timeEntriesCollection = db.collection("timeEntries");
  const archiveTimeEntriesCollection = db.collection("archiveTimeEntries");

  const lastFriday = getLastFriday().toDate();
  const twoMonthsBack = getTwoMonthsBack().toDate();

  const oldEntries = await timeEntriesCollection
    .find({
      date: { $gte: twoMonthsBack, $lt: lastFriday },
    })
    .toArray();

  if (oldEntries.length > 0) {
    //add data into archive collection
    await archiveTimeEntriesCollection.insertMany(oldEntries);

    //delete data from main collection
    await timeEntriesCollection.deleteMany({
      date: { $gte: twoMonthsBack, $lt: lastFriday },
    });
    console.log(`Archived and deleted old time entries up to ${lastFriday}.`);
  }
}

// Function to import time entries from CSV files
async function importTimeEntries(db, csvPath, projectName) {
  const timeEntriesCollection = db.collection("timeEntries");
  console.log(`Importing time entries from ${csvPath}`);

  const timeEntries = [];

  fs.createReadStream(csvPath)
    .pipe(csvParser())
    .on("data", (row) => {
      timeEntries.push({
        username: row["User"],
        projectName,
        date: moment(row["Date"], "MM/DD/YYYY").toDate(),
        hours: parseFloat(row["Time (decimal)"]),
        description: row["Description"],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    })
    .on("end", async () => {
      if (timeEntries.length > 0) {
        try {
          await timeEntriesCollection.insertMany(timeEntries);
          console.log(`Time entries for ${projectName} imported successfully`);
        } catch (err) {
          console.error(
            `Error during time entry import for ${projectName}:`,
            err
          );
        }
      }
    });
}

// Function to import data from a specific folder
async function importFolder(db, folder, folderPath) {
  fs.readdir(folderPath, (err, files) => {
    if (err) throw err;

    files.forEach(async (file) => {
      if (file.endsWith(".csv")) {
        const filePath = path.join(folderPath, file);
        const projectName = file.split(".")[0]; // Extract project name from the file name
        await importTimeEntries(db, filePath, projectName);
      }
    });
  });
}

// Main function to import all data
async function importData(client) {
  try {
    const db = client.db(dbName);

    // Archive and delete old time entries
    await archiveAndDeleteOldTimeEntries(db);

    // Import data for each subfolder in the Data folder
    fs.readdir(dataFolderPath, (err, folders) => {
      if (err) throw err;

      folders.forEach(async (folder) => {
        const folderPath = path.join(dataFolderPath, folder);
        if (fs.lstatSync(folderPath).isDirectory()) {
          await importFolder(db, folder, folderPath);
        }
      });
    });
  } catch (err) {
    console.error("Error during MongoDB operation:", err);
  }
}

// Start the initial import process
async function startInitialImport(client) {
  console.log("Starting import for new files...");
  await importData(client);
  console.log("Import for new files completed.");
}

// Watcher function to monitor the Data folder
function startWatching(client) {
  const watcher = chokidar.watch(dataFolderPath, {
    persistent: true,
    ignoreInitial: true, // Ignore initial add events when starting the watcher
  });

  let timer;
  let newFiles = [];

  watcher.on("add", (filePath) => {
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
    console.log("Successfully connected to MongoDB");

    startWatching(client); // Start watching for new files
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
  }
});
