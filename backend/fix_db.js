const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_nozyvIkS1Ng4@ep-silent-dust-az6nes33-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function fix() {
  await client.connect();
  const res = await client.query('UPDATE users SET is_verified = TRUE');
  console.log(`Updated ${res.rowCount} users to be verified!`);
  await client.end();
}

fix().catch(console.error);
