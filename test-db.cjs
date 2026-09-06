const { Client } = require("pg");

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

client
  .connect()
  .then(() => {
    console.log("✅ PostgreSQL connection successful!");
    return client.query("SELECT NOW()");
  })
  .then((result) => {
    console.log("Database time:", result.rows[0]);
  })
  .catch((error) => {
    console.error("❌ PostgreSQL connection failed:");
    console.error(error.message);
  })
  .finally(() => {
    client.end();
  });