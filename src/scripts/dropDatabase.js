// dropDatabase.js

const { MongoClient } = require('mongodb');

async function dropDatabase() {
  const uri = 'mongodb://localhost:27017'; // Change as needed
  const dbName = 'your-database-name'; // Change to your actual DB name

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    // Drop the database
    await db.dropDatabase();
    console.log(`✅ Database '${dbName}' dropped successfully.`);
  } catch (error) {
    console.error('❌ Error dropping database:', error);
  } finally {
    await client.close();
  }
}

dropDatabase();
