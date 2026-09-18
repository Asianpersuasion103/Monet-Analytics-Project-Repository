

const { MongoClient } = require('mongodb');

const url = 'mongodb+srv://allisgalon_db_user:<khXj4rdZJ5RikHUO>@cluster0.jcf7dya.mongodb.net/?appName=Cluster0://localhost:27017'; 
const client = new MongoClient(url);

async function main() {
    try {
        // Connect to the MongoDB cluster
        await client.connect();
        console.log("Successfully connected to MongoDB!");
        
        // Specify the database name you want to use
        const db = client.db('myDatabase');
        
    } catch (e) {
        console.error("Connection error:", e);
    } finally {
        // Close the connection when done
        await client.close();
    }
}

main();

