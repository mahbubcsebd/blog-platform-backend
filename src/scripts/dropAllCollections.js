// dropAllCollections.js

const { MongoClient } = require('mongodb');

async function dropAllCollections() {
  const uri = 'mongodb://localhost:27017';
  const dbName = 'your-database-name';

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    // Get all collection names
    const collections = await db.listCollections().toArray();

    // Drop each collection
    for (const collection of collections) {
      await db.collection(collection.name).drop();
      console.log(`🗑️ Dropped collection: ${collection.name}`);
    }

    console.log('✅ All collections dropped.');
  } catch (error) {
    console.error('❌ Error dropping collections:', error);
  } finally {
    await client.close();
  }
}

dropAllCollections();
