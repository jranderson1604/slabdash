#!/usr/bin/env node

/**
 * One-time script to set your user role to 'owner'
 * Run: node set-owner-role.js
 */

const { Client } = require('pg');

async function setOwnerRole() {
  const email = 'jranderson1604@gmail.com';

  // Get DATABASE_URL from Railway
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL environment variable not found');
    console.log('\nTo fix this:');
    console.log('1. Go to https://railway.com/project/23b6ca53-eb96-4302-9206-db0fc82b07af');
    console.log('2. Click on your Postgres database');
    console.log('3. Click "Connect"');
    console.log('4. Copy the "DATABASE_URL" connection string');
    console.log('5. Run: set DATABASE_URL=<paste-connection-string-here>');
    console.log('6. Then run this script again: node set-owner-role.js');
    process.exit(1);
  }

  const client = new Client({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected!\n');

    // Update the user role
    console.log(`🔧 Setting role to 'owner' for ${email}...`);
    const result = await client.query(
      'UPDATE users SET role = $1 WHERE email = $2 RETURNING id, name, email, role',
      ['owner', email]
    );

    if (result.rows.length === 0) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }

    const user = result.rows[0];
    console.log('✅ SUCCESS!\n');
    console.log('User updated:');
    console.log(`  ID: ${user.id}`);
    console.log(`  Name: ${user.name}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);
    console.log('\n📋 Next steps:');
    console.log('  1. Log out of SlabDash');
    console.log('  2. Log back in');
    console.log('  3. You should see "Platform Control" at the top of your sidebar!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setOwnerRole();
