const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
const { users } = require('./schema');

const defaultDatabaseUrlParameterName = '/database/url';
const defaultAwsRegion = 'eu-north-1';

async function getSecret(name) {
  const ssmClient = new SSMClient({
    region: process.env.AWS_REGION || defaultAwsRegion,
  });

  const command = new GetParameterCommand({
    Name: name,
    WithDecryption: true,
  });

  const response = await ssmClient.send(command);

  if (!response.Parameter || !response.Parameter.Value) {
    throw new Error(`SSM parameter ${name} did not return a value.`);
  }

  return response.Parameter.Value;
}

async function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const parameterName = process.env.DATABASE_URL_PARAMETER_NAME || defaultDatabaseUrlParameterName;
  const databaseUrl = await getSecret(parameterName);

  process.env.DATABASE_URL = databaseUrl;

  return databaseUrl;
}

function getDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required. Set it directly or configure DATABASE_URL_PARAMETER_NAME in AWS SSM.');
  }

  return process.env.DATABASE_URL;
}

let client;
let db;

function getDb() {
  if (!db) {
    client = postgres(getDatabaseUrl(), {
      max: 10,
      prepare: false,
    });

    db = drizzle(client, { schema: { users } });
  }

  return db;
}

async function initializeDatabase() {
  await loadDatabaseUrl();

  const database = getDb();

  await client.unsafe(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const existingUsers = await database.select().from(users);

  if (existingUsers.length === 0) {
    await database.insert(users).values([
      { name: 'Ava Stone', email: 'ava.stone@example.com' },
      { name: 'Leo Park', email: 'leo.park@example.com' },
      { name: 'Mia Chen', email: 'mia.chen@example.com' },
    ]);
  }
}

async function closeDatabaseConnection() {
  if (client) {
    await client.end();
    client = undefined;
    db = undefined;
  }
}

module.exports = {
  getDb,
  initializeDatabase,
  closeDatabaseConnection,
};
