/**
 * LifeOS Self-Hosted Backend API Server
 * Provides REST API for setup, authentication, and data operations
 * when running in self-hosted mode (Docker/XAMPP) without Supabase.
 */

const http = require('http');
const crypto = require('crypto');

// --- Configuration ---
const PORT = process.env.API_PORT || 3001;
let dbClient = null;
let dbType = process.env.DB_TYPE || 'postgresql'; // postgresql or mysql

// --- Database Connection ---
async function connectDatabase(config) {
  const type = config.dbType || dbType;

  if (type === 'postgresql') {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || process.env.DB_PORT || 5432,
      database: config.database || process.env.DB_NAME || 'lifeos',
      user: config.username || process.env.DB_USER || 'lifeos',
      password: config.password || process.env.DB_PASSWORD || '',
      max: 20,
    });
    await pool.query('SELECT 1');
    return { type: 'postgresql', pool };
  }

  if (type === 'mysql') {
    const mysql = require('mysql2/promise');
    const pool = mysql.createPool({
      host: config.host || process.env.DB_HOST || 'localhost',
      port: config.port || process.env.DB_PORT || 3306,
      database: config.database || process.env.DB_NAME || 'lifeos',
      user: config.username || process.env.DB_USER || 'root',
      password: config.password || process.env.DB_PASSWORD || '',
      waitForConnections: true,
      connectionLimit: 20,
    });
    await pool.query('SELECT 1');
    return { type: 'mysql', pool };
  }

  throw new Error(`Unsupported database type: ${type}`);
}

async function query(sql, params = []) {
  if (!dbClient) throw new Error('Database not connected');

  if (dbClient.type === 'postgresql') {
    const result = await dbClient.pool.query(sql, params);
    return result.rows;
  }

  if (dbClient.type === 'mysql') {
    // Convert $1, $2 placeholders to ? for MySQL
    const mysqlSql = sql.replace(/\$(\d+)/g, '?');
    const [rows] = await dbClient.pool.query(mysqlSql, params);
    return rows;
  }
}

// --- Password Hashing ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verify;
}

// --- JWT-like Token ---
function createToken(userId, email) {
  const payload = {
    sub: userId,
    email,
    iat: Date.now(),
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', process.env.JWT_SECRET || 'lifeos-self-hosted-secret-change-me')
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

function verifyToken(token) {
  try {
    const [data, signature] = token.split('.');
    const expected = crypto
      .createHmac('sha256', process.env.JWT_SECRET || 'lifeos-self-hosted-secret-change-me')
      .update(data)
      .digest('base64url');
    if (signature !== expected) return null;
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// --- UUID Generator (compatible with Node 14+) ---
function uuid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback using crypto.randomBytes
  const nodeCrypto = require('crypto');
  const bytes = nodeCrypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
}

// --- Schema Initialization ---
const PG_SCHEMA = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255),
  email_verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  email VARCHAR(255),
  avatar_url TEXT,
  currency VARCHAR(10) DEFAULT 'USD',
  timezone VARCHAR(50) DEFAULT 'UTC',
  date_format VARCHAR(20) DEFAULT 'MM/dd/yyyy',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  onboarding_enabled BOOLEAN DEFAULT true,
  setup_complete BOOLEAN DEFAULT false,
  db_type VARCHAR(20) DEFAULT 'postgresql',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS license_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

const MYSQL_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255),
  email_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_role (user_id, role),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  session_token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  email VARCHAR(255),
  avatar_url TEXT,
  currency VARCHAR(10) DEFAULT 'USD',
  timezone VARCHAR(50) DEFAULT 'UTC',
  date_format VARCHAR(20) DEFAULT 'MM/dd/yyyy',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS app_settings (
  id CHAR(36) PRIMARY KEY,
  onboarding_enabled BOOLEAN DEFAULT TRUE,
  setup_complete BOOLEAN DEFAULT FALSE,
  db_type VARCHAR(20) DEFAULT 'mysql',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS license_settings (
  id CHAR(36) PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

// --- Request Helpers ---
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });
  res.end(JSON.stringify(data));
}

function getAuthUser(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

// --- Route Handlers ---
const routes = {};

// Setup: Test connection
routes['POST /api/setup/test-connection'] = async (req, res) => {
  const body = await parseBody(req);
  try {
    const conn = await connectDatabase(body);
    if (conn.type === 'postgresql') await conn.pool.end();
    if (conn.type === 'mysql') await conn.pool.end();
    sendJson(res, 200, { success: true, message: 'Connection successful' });
  } catch (err) {
    sendJson(res, 400, { success: false, message: err.message });
  }
};

// Setup: Check status (enhanced for Docker-aware flow)
routes['GET /api/setup/status'] = async (req, res) => {
  try {
    if (!dbClient) {
      // Try to connect with env vars
      try {
        dbClient = await connectDatabase({});
      } catch {
        sendJson(res, 200, { isSetup: false, needsSetup: true, isDocker: !!process.env.DB_HOST });
        return;
      }
    }
    const rows = await query('SELECT setup_complete, db_type FROM app_settings LIMIT 1');
    const isDocker = !!process.env.DB_HOST;

    if (rows.length > 0 && rows[0].setup_complete) {
      sendJson(res, 200, { isSetup: true, needsSetup: false, dbType: rows[0].db_type, isDocker });
    } else {
      // Check if any admin user exists (wizard-created)
      let hasAdmin = false;
      try {
        const adminRows = await query("SELECT COUNT(*) as cnt FROM user_roles WHERE role = 'admin'");
        hasAdmin = parseInt(adminRows[0].cnt) > 0;
      } catch {}
      sendJson(res, 200, { isSetup: false, needsSetup: true, hasAdmin, isDocker, dbType: rows.length > 0 ? rows[0].db_type : dbType });
    }
  } catch {
    sendJson(res, 200, { isSetup: false, needsSetup: true, isDocker: !!process.env.DB_HOST });
  }
};

// Setup: Create admin account (Docker first-run wizard)
routes['POST /api/setup/admin'] = async (req, res) => {
  const body = await parseBody(req);
  const { email, password, name } = body;

  if (!email || !password) {
    sendJson(res, 400, { success: false, message: 'Email and password are required.' });
    return;
  }
  if (password.length < 6) {
    sendJson(res, 400, { success: false, message: 'Password must be at least 6 characters.' });
    return;
  }

  try {
    // Ensure DB is connected and schema exists
    if (!dbClient) {
      dbClient = await connectDatabase({});
      await ensureSchema();
    }

    const adminId = uuid();
    const passwordHash = hashPassword(password);
    const adminName = name || 'Administrator';

    if (dbType === 'postgresql') {
      await query(
        `INSERT INTO users (id, email, password_hash, full_name, email_verified) 
         VALUES ($1, $2, $3, $4, true) ON CONFLICT (email) DO UPDATE SET password_hash = $3, full_name = $4`,
        [adminId, email, passwordHash, adminName]
      );
      const adminRows = await query('SELECT id FROM users WHERE email = $1', [email]);
      const realAdminId = adminRows[0].id;
      await query(
        `INSERT INTO user_roles (id, user_id, role) VALUES ($1, $2, 'admin'::app_role) ON CONFLICT (user_id, role) DO NOTHING`,
        [uuid(), realAdminId]
      );
      await query(
        `INSERT INTO profiles (id, user_id, full_name, email) VALUES ($1, $2, $3, $4) 
         ON CONFLICT (user_id) DO UPDATE SET full_name = $3, email = $4`,
        [uuid(), realAdminId, adminName, email]
      );
      // Mark setup as started (not complete until license is done)
      await query(
        `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', false, $1)
         ON CONFLICT (id) DO UPDATE SET setup_complete = false`,
        [dbType]
      );
    } else {
      await query(
        `INSERT INTO users (id, email, password_hash, full_name, email_verified) 
         VALUES (?, ?, ?, ?, true) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), full_name = VALUES(full_name)`,
        [adminId, email, passwordHash, adminName]
      );
      const adminRows = await query('SELECT id FROM users WHERE email = ?', [email]);
      const realAdminId = adminRows[0].id;
      await query(
        `INSERT IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')`,
        [uuid(), realAdminId]
      );
      await query(
        `INSERT INTO profiles (id, user_id, full_name, email) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email)`,
        [uuid(), realAdminId, adminName, email]
      );
      await query(
        `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', false, ?)
         ON DUPLICATE KEY UPDATE setup_complete = false`,
        [dbType]
      );
    }

    // Mark that admin was created via wizard (so seedDefaultAdmin skips)
    await setLicenseSetting('wizard_admin_created', 'true');

    sendJson(res, 200, { success: true, message: 'Admin account created successfully.' });
  } catch (err) {
    sendJson(res, 500, { success: false, message: err.message });
  }
};

// Setup: Initialize database
routes['POST /api/setup/initialize'] = async (req, res) => {
  const body = await parseBody(req);
  try {
    dbClient = await connectDatabase(body);
    dbType = body.dbType;

    // Create schema
    const schema = dbType === 'mysql' ? MYSQL_SCHEMA : PG_SCHEMA;
    const statements = schema.split(';').filter((s) => s.trim());
    for (const stmt of statements) {
      if (stmt.trim()) await query(stmt + ';');
    }

    // Create admin user
    const adminId = uuid();
    const passwordHash = hashPassword(body.adminPassword);

    if (dbType === 'postgresql') {
      await query(
        `INSERT INTO users (id, email, password_hash, full_name, email_verified) 
         VALUES ($1, $2, $3, $4, true) ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
        [adminId, body.adminEmail, passwordHash, body.adminName || 'Administrator']
      );
      await query(
        `INSERT INTO user_roles (id, user_id, role) VALUES ($1, $2, 'admin'::app_role) ON CONFLICT DO NOTHING`,
        [uuid(), adminId]
      );
      await query(
        `INSERT INTO profiles (id, user_id, full_name, email) VALUES ($1, $2, $3, $4) 
         ON CONFLICT (user_id) DO UPDATE SET full_name = $3, email = $4`,
        [uuid(), adminId, body.adminName || 'Administrator', body.adminEmail]
      );
      await query(
        `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ($1, true, $2)
         ON CONFLICT DO NOTHING`,
        [uuid(), dbType]
      );
    } else {
      // MySQL
      await query(
        `INSERT INTO users (id, email, password_hash, full_name, email_verified) 
         VALUES (?, ?, ?, ?, true) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
        [adminId, body.adminEmail, passwordHash, body.adminName || 'Administrator']
      );
      await query(
        `INSERT IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')`,
        [uuid(), adminId]
      );
      await query(
        `INSERT INTO profiles (id, user_id, full_name, email) VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), email = VALUES(email)`,
        [uuid(), adminId, body.adminName || 'Administrator', body.adminEmail]
      );
      await query(
        `INSERT IGNORE INTO app_settings (id, setup_complete, db_type) VALUES (?, true, ?)`,
        [uuid(), dbType]
      );
    }

    sendJson(res, 200, { success: true, message: 'Database initialized successfully' });
  } catch (err) {
    sendJson(res, 500, { success: false, message: err.message });
  }
};

// Auth: Login
routes['POST /api/auth/login'] = async (req, res) => {
  const { email, password } = await parseBody(req);
  try {
    const users = await query('SELECT id, email, password_hash, full_name FROM users WHERE email = $1', [email]);
    if (users.length === 0) {
      sendJson(res, 401, { message: 'Invalid email or password' });
      return;
    }
    const user = users[0];
    if (!verifyPassword(password, user.password_hash)) {
      sendJson(res, 401, { message: 'Invalid email or password' });
      return;
    }
    const token = createToken(user.id, user.email);

    // Get roles
    const roles = await query('SELECT role FROM user_roles WHERE user_id = $1', [user.id]);

    sendJson(res, 200, {
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        roles: roles.map((r) => r.role),
      },
    });
  } catch (err) {
    sendJson(res, 500, { message: err.message });
  }
};

// Auth: Register
routes['POST /api/auth/register'] = async (req, res) => {
  const { email, password, full_name } = await parseBody(req);
  try {
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      sendJson(res, 409, { message: 'Email already registered' });
      return;
    }

    const userId = uuid();
    const passwordHash = hashPassword(password);

    await query(
      'INSERT INTO users (id, email, password_hash, full_name, email_verified) VALUES ($1, $2, $3, $4, true)',
      [userId, email, passwordHash, full_name || '']
    );
    await query('INSERT INTO user_roles (id, user_id, role) VALUES ($1, $2, $3::app_role)', [uuid(), userId, 'user']);
    await query(
      'INSERT INTO profiles (id, user_id, full_name, email) VALUES ($1, $2, $3, $4)',
      [uuid(), userId, full_name || '', email]
    );

    const token = createToken(userId, email);
    sendJson(res, 201, {
      token,
      user: { id: userId, email, full_name, roles: ['user'] },
    });
  } catch (err) {
    sendJson(res, 500, { message: err.message });
  }
};

// Auth: Session
routes['GET /api/auth/session'] = async (req, res) => {
  const payload = getAuthUser(req);
  if (!payload) {
    sendJson(res, 401, { message: 'Not authenticated' });
    return;
  }
  try {
    const users = await query('SELECT id, email, full_name FROM users WHERE id = $1', [payload.sub]);
    if (users.length === 0) {
      sendJson(res, 401, { message: 'User not found' });
      return;
    }
    const roles = await query('SELECT role FROM user_roles WHERE user_id = $1', [payload.sub]);
    sendJson(res, 200, {
      user: { ...users[0], roles: roles.map((r) => r.role) },
    });
  } catch (err) {
    sendJson(res, 500, { message: err.message });
  }
};

// Auth: Logout
routes['POST /api/auth/logout'] = async (req, res) => {
  sendJson(res, 200, { success: true });
};

// Auth: Change Password
routes['POST /api/auth/change-password'] = async (req, res) => {
  const payload = getAuthUser(req);
  if (!payload) {
    sendJson(res, 401, { message: 'Not authenticated' });
    return;
  }
  const { current_password, new_password } = await parseBody(req);
  if (!new_password || new_password.length < 8) {
    sendJson(res, 400, { success: false, message: 'New password must be at least 8 characters.' });
    return;
  }
  try {
    const users = await query('SELECT id, password_hash FROM users WHERE id = $1', [payload.sub]);
    if (users.length === 0) {
      sendJson(res, 404, { success: false, message: 'User not found.' });
      return;
    }
    // Verify current password
    if (current_password) {
      const hash = crypto.createHash('sha256').update(current_password).digest('hex');
      if (hash !== users[0].password_hash) {
        sendJson(res, 403, { success: false, message: 'Current password is incorrect.' });
        return;
      }
    }
    const newHash = crypto.createHash('sha256').update(new_password).digest('hex');
    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, payload.sub]);
    sendJson(res, 200, { success: true, message: 'Password updated successfully.' });
  } catch (err) {
    sendJson(res, 500, { success: false, message: err.message });
  }
};

// Auth: Update Email
routes['POST /api/auth/update-email'] = async (req, res) => {
  const payload = getAuthUser(req);
  if (!payload) {
    sendJson(res, 401, { message: 'Not authenticated' });
    return;
  }
  const { email } = await parseBody(req);
  if (!email || !email.includes('@')) {
    sendJson(res, 400, { success: false, message: 'Invalid email address.' });
    return;
  }
  try {
    // Check if email already in use
    const existing = await query('SELECT id FROM users WHERE email = $1 AND id != $2', [email, payload.sub]);
    if (existing.length > 0) {
      sendJson(res, 409, { success: false, message: 'Email already in use by another account.' });
      return;
    }
    await query('UPDATE users SET email = $1 WHERE id = $2', [email, payload.sub]);
    sendJson(res, 200, { success: true, message: 'Email updated successfully.' });
  } catch (err) {
    sendJson(res, 500, { success: false, message: err.message });
  }
};

// --- License Verification via Supabase Edge Function ---
const LICENSE_VERIFY_URL = process.env.LICENSE_API_URL || 'https://abcytwvuntyicdknpzju.supabase.co/functions/v1/verify-license';
const LICENSE_ENCRYPTION_KEY = process.env.LICENSE_ENC_KEY || 'ITSupportBD_SecureKey_2024';
const LICENSE_VERIFICATION_INTERVAL = 86400; // 24 hours
const LICENSE_GRACE_PERIOD_DAYS = 7;
const LICENSE_OFFLINE_MAX_DAYS = 30;
const LICENSE_OFFLINE_WARNING_DAYS = 9;

// In-memory license cache (persisted to DB)
let licenseCache = {
  status: 'unknown',
  message: 'License status unknown.',
  max_devices: 0,
  expires_at: null,
  last_verified: 0,
  last_verified_key: null,
  last_successful_connection: null,
};

function decryptLicenseData(encryptedBase64) {
  try {
    const data = Buffer.from(encryptedBase64, 'base64');
    const ivLength = 16;
    const iv = data.slice(0, ivLength);
    const ciphertextBase64 = data.slice(ivLength).toString('utf8');
    const ciphertext = Buffer.from(ciphertextBase64, 'base64');

    const keyBuffer = Buffer.alloc(32);
    Buffer.from(LICENSE_ENCRYPTION_KEY, 'utf8').copy(keyBuffer);

    const decipher = crypto.createDecipheriv('aes-256-cbc', keyBuffer, iv);
    let decrypted = decipher.update(ciphertext, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('License decryption error:', err.message);
    return null;
  }
}

// Get or create installation ID
async function getOrCreateInstallationId() {
  try {
    if (dbType === 'postgresql') {
      const rows = await query("SELECT setting_value FROM license_settings WHERE setting_key = 'installation_id'");
      if (rows.length > 0 && rows[0].setting_value) return rows[0].setting_value;
      
      const installId = 'LIFEOS-' + uuid();
      await query(
        "INSERT INTO license_settings (id, setting_key, setting_value) VALUES ($1, 'installation_id', $2) ON CONFLICT (setting_key) DO NOTHING",
        [uuid(), installId]
      );
      return installId;
    } else {
      const rows = await query("SELECT setting_value FROM license_settings WHERE setting_key = 'installation_id'");
      if (rows.length > 0 && rows[0].setting_value) return rows[0].setting_value;
      
      const installId = 'LIFEOS-' + uuid();
      await query(
        "INSERT IGNORE INTO license_settings (id, setting_key, setting_value) VALUES (?, 'installation_id', ?)",
        [uuid(), installId]
      );
      return installId;
    }
  } catch {
    return 'LIFEOS-' + uuid();
  }
}

// Get/set license settings from DB
async function getLicenseSetting(key) {
  try {
    const rows = await query("SELECT setting_value FROM license_settings WHERE setting_key = $1", [key]);
    return rows.length > 0 ? rows[0].setting_value : null;
  } catch { return null; }
}

async function setLicenseSetting(key, value) {
  try {
    if (dbType === 'postgresql') {
      await query(
        "INSERT INTO license_settings (id, setting_key, setting_value) VALUES ($1, $2, $3) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $3, updated_at = NOW()",
        [uuid(), key, value]
      );
    } else {
      await query(
        "INSERT INTO license_settings (id, setting_key, setting_value) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = CURRENT_TIMESTAMP",
        [uuid(), key, value]
      );
    }
  } catch (err) {
    console.error(`Error setting license setting ${key}:`, err.message);
  }
}

// Load license cache from DB
async function loadLicenseCache() {
  const cached = await getLicenseSetting('license_cache');
  if (cached) {
    try {
      const data = JSON.parse(cached);
      Object.assign(licenseCache, data);
    } catch {}
  }
}

// Save license cache to DB
async function saveLicenseCache() {
  await setLicenseSetting('license_cache', JSON.stringify(licenseCache));
}

// Core license verification function
async function verifyLicenseWithPortal(licenseKey, force = false) {
  if (!licenseKey) {
    licenseCache.status = 'unconfigured';
    licenseCache.message = 'Application license key is missing.';
    return licenseCache;
  }

  // Check if key changed
  if (licenseCache.last_verified_key !== licenseKey) force = true;

  // Use cached data if within interval
  if (!force && licenseCache.last_verified && (Date.now() / 1000 - licenseCache.last_verified) < LICENSE_VERIFICATION_INTERVAL) {
    return licenseCache;
  }

  const installationId = await getOrCreateInstallationId();
  let deviceCount = 1;
  try {
    const countRows = await query('SELECT COUNT(*) as cnt FROM users');
    deviceCount = parseInt(countRows[0].cnt) || 1;
  } catch {}

  const postData = JSON.stringify({
    app_license_key: licenseKey,
    user_id: 'lifeos-backend',
    current_device_count: deviceCount,
    installation_id: installationId,
  });

  try {
    const https = require('https');
    const http_mod = require('http');
    const url = new URL(LICENSE_VERIFY_URL);
    const requestModule = url.protocol === 'https:' ? https : http_mod;

    const portalResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        rejectUnauthorized: false,
      };

      const request = requestModule.request(options, (response) => {
        let body = '';
        response.on('data', (chunk) => (body += chunk));
        response.on('end', () => resolve(body));
      });

      request.on('error', reject);
      request.setTimeout(10000, () => { request.destroy(); reject(new Error('Timeout')); });
      request.write(postData);
      request.end();
    });

    const result = decryptLicenseData(portalResponse);
    if (!result) {
      // Try plain JSON fallback
      try {
        const plain = JSON.parse(portalResponse);
        Object.assign(result || {}, plain);
      } catch {
        licenseCache.status = 'error';
        licenseCache.message = 'Failed to decrypt license response.';
        licenseCache.last_verified = Math.floor(Date.now() / 1000);
        await saveLicenseCache();
        return licenseCache;
      }
    }

    // Successful connection - reset offline counter
    licenseCache.last_successful_connection = Math.floor(Date.now() / 1000);
    await setLicenseSetting('last_successful_portal_connection', String(licenseCache.last_successful_connection));

    licenseCache.status = result.actual_status || 'invalid';
    licenseCache.message = result.message || 'License is invalid.';
    licenseCache.max_devices = result.max_devices || 0;
    licenseCache.expires_at = result.expires_at || null;

    // Handle grace period
    if (licenseCache.status === 'expired' && licenseCache.expires_at) {
      const expiryTs = new Date(licenseCache.expires_at).getTime() / 1000;
      const graceEnd = expiryTs + LICENSE_GRACE_PERIOD_DAYS * 86400;
      if (Date.now() / 1000 < graceEnd) {
        licenseCache.status = 'grace_period';
        licenseCache.message = `License expired. Grace period until ${new Date(graceEnd * 1000).toISOString()}.`;
      } else {
        licenseCache.status = 'disabled';
        licenseCache.message = 'License expired and grace period ended.';
      }
    }

    licenseCache.last_verified = Math.floor(Date.now() / 1000);
    licenseCache.last_verified_key = licenseKey;
    await saveLicenseCache();

    console.log(`LICENSE_INFO: Verification completed. Status: ${licenseCache.status}`);
    return licenseCache;

  } catch (err) {
    console.error('LICENSE_ERROR: Portal unreachable:', err.message);

    // Offline mode handling
    let lastConn = licenseCache.last_successful_connection;
    if (!lastConn) {
      const stored = await getLicenseSetting('last_successful_portal_connection');
      lastConn = stored ? parseInt(stored) : Math.floor(Date.now() / 1000);
      if (!stored) await setLicenseSetting('last_successful_portal_connection', String(lastConn));
      licenseCache.last_successful_connection = lastConn;
    }

    const daysOffline = Math.floor((Date.now() / 1000 - lastConn) / 86400);

    if (daysOffline >= LICENSE_OFFLINE_MAX_DAYS) {
      licenseCache.status = 'offline_expired';
      licenseCache.message = `Disabled: Unable to verify for ${daysOffline} days.`;
    } else if (daysOffline >= LICENSE_OFFLINE_WARNING_DAYS) {
      const remaining = LICENSE_OFFLINE_MAX_DAYS - daysOffline;
      licenseCache.status = 'offline_warning';
      licenseCache.message = `WARNING: Offline for ${daysOffline} days. Disabled in ${remaining} days.`;
    } else {
      licenseCache.status = 'offline_mode';
      licenseCache.message = `Offline mode (Day ${daysOffline}/${LICENSE_OFFLINE_MAX_DAYS}).`;
    }

    licenseCache.last_verified = Math.floor(Date.now() / 1000);
    await saveLicenseCache();
    return licenseCache;
  }
}

// API: Verify license
routes['POST /api/license/verify'] = async (req, res) => {
  const { license_key } = await parseBody(req);
  if (!license_key) {
    sendJson(res, 400, { success: false, message: 'License key is required.' });
    return;
  }

  try {
    const result = await verifyLicenseWithPortal(license_key, true);
    const isActive = ['active', 'free', 'grace_period', 'offline_mode', 'offline_warning'].includes(result.status);

    // Save license key on success
    if (isActive) {
      await setLicenseSetting('app_license_key', license_key);
    }

    sendJson(res, 200, {
      success: isActive,
      message: result.message,
      actual_status: result.status,
      max_devices: result.max_devices,
      expires_at: result.expires_at,
    });
  } catch (err) {
    console.error('License verification error:', err.message);
    sendJson(res, 500, { success: false, message: 'License verification failed: ' + err.message });
  }
};

// API: Get license status (for UI)
routes['GET /api/license/status'] = async (req, res) => {
  await loadLicenseCache();
  const licenseKey = await getLicenseSetting('app_license_key');
  const hasKey = !!licenseKey;

  sendJson(res, 200, {
    configured: hasKey,
    status: licenseCache.status,
    message: licenseCache.message,
    max_devices: licenseCache.max_devices,
    expires_at: licenseCache.expires_at,
    last_verified: licenseCache.last_verified,
  });
};

// API: Setup license (initial activation) — marks setup_complete = true
routes['POST /api/license/setup'] = async (req, res) => {
  const { license_key } = await parseBody(req);
  if (!license_key || license_key.trim().length === 0) {
    sendJson(res, 400, { success: false, message: 'License key is required.' });
    return;
  }

  try {
    const result = await verifyLicenseWithPortal(license_key.trim(), true);
    const isActive = ['active', 'free', 'grace_period'].includes(result.status);

    if (isActive) {
      await setLicenseSetting('app_license_key', license_key.trim());

      // Mark setup as fully complete now that license is activated
      if (dbType === 'postgresql') {
        await query(
          `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', true, $1)
           ON CONFLICT (id) DO UPDATE SET setup_complete = true`,
          [dbType]
        );
      } else {
        await query(
          `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', true, ?)
           ON DUPLICATE KEY UPDATE setup_complete = true`,
          [dbType]
        );
      }

      sendJson(res, 200, { success: true, message: 'License activated successfully!', status: result.status });
    } else {
      sendJson(res, 200, { success: false, message: result.message, status: result.status });
    }
  } catch (err) {
    sendJson(res, 500, { success: false, message: 'Verification failed: ' + err.message });
  }
};

// --- License Enforcement Middleware ---
const LICENSE_EXEMPT_ROUTES = [
  'POST /api/license/verify',
  'POST /api/license/setup',
  'GET /api/license/status',
  'POST /api/setup/test-connection',
  'GET /api/setup/status',
  'POST /api/setup/initialize',
  'POST /api/setup/admin',
  'POST /api/auth/login',
  'POST /api/auth/logout',
  'POST /api/auth/register',
  'POST /api/auth/change-password',
  'POST /api/auth/update-email',
];

async function checkLicenseMiddleware(req) {
  const routeKey = `${req.method} ${req.url.split('?')[0]}`;
  if (LICENSE_EXEMPT_ROUTES.includes(routeKey)) return true;

  // If license not loaded yet, try to load
  if (licenseCache.status === 'unknown') {
    await loadLicenseCache();
  }

  const allowedStatuses = ['active', 'free', 'grace_period', 'offline_mode', 'offline_warning'];
  return allowedStatuses.includes(licenseCache.status);
}

// --- Setup Enforcement Middleware ---
async function checkSetupMiddleware(req) {
  const routeKey = `${req.method} ${req.url.split('?')[0]}`;
  // Always allow setup, license, and auth routes
  const setupExempt = [
    'GET /api/setup/status', 'POST /api/setup/admin', 'POST /api/setup/initialize', 'POST /api/setup/test-connection',
    'POST /api/license/verify', 'POST /api/license/setup', 'GET /api/license/status',
    'POST /api/auth/login', 'POST /api/auth/logout', 'POST /api/auth/register', 'GET /api/auth/session',
    'POST /api/auth/change-password', 'POST /api/auth/update-email',
  ];
  if (setupExempt.includes(routeKey)) return true;

  // Check if setup is complete
  try {
    const rows = await query('SELECT setup_complete FROM app_settings LIMIT 1');
    if (rows.length > 0 && rows[0].setup_complete) return true;
  } catch {}
  return false;
}

// --- App State (for health endpoint) ---
let appState = { status: 'starting', message: 'Initializing...' };

// --- PostgREST-Compatible Proxy Layer ---
// Translates Supabase REST API calls into direct PostgreSQL queries
// so all supabase.from() calls work in Docker mode without changes.

const POSTGREST_TABLES = new Set([
  'tasks', 'notes', 'transactions', 'goals', 'investments', 'projects',
  'salary_entries', 'habits', 'family_members', 'family_events',
  'budgets', 'budget_categories', 'task_categories',
  'habit_completions', 'goal_milestones', 'project_milestones',
  'task_checklists', 'task_follow_up_notes', 'task_assignments',
  'family_member_connections', 'family_documents',
  'loan_payments', 'device_service_history', 'backup_schedules',
  'loans', 'profiles', 'app_settings', 'user_roles',
  'support_users', 'support_units', 'support_departments',
  'support_user_devices', 'device_inventory', 'device_categories',
  'device_suppliers', 'device_disposals', 'device_transfer_history',
  'support_tickets', 'ticket_categories', 'ticket_comments',
  'ticket_activity_log', 'ticket_requesters', 'ticket_form_fields',
  'attachments', 'smtp_settings', 'app_secrets',
  'google_calendar_sync', 'synced_calendar_events',
  'push_subscriptions', 'user_sessions', 'user_mfa_settings',
  'email_otp_codes', 'audit_logs', 'user_workspace_permissions',
  'qr_code_settings',
  'ai_config', 'app_notifications', 'notification_preferences',
  'pomodoro_settings', 'time_entries', 'custom_form_fields',
  'form_field_config', 'module_config',
  'workflow_rules', 'workflow_logs', 'webhook_configs', 'task_templates',
]);

// Tables that should NOT be auto-scoped by user_id
const NO_USER_SCOPE_TABLES = new Set([
  'app_settings', 'ticket_categories', 'ticket_form_fields',
  'support_units', 'support_departments', 'device_suppliers',
  'device_inventory', 'device_categories', 'device_service_history',
  'support_users', 'user_roles',
  'ticket_requesters',
  'device_transfer_history', 'form_field_config', 'module_config',
  'support_tickets', 'ticket_comments', 'ticket_activity_log',
]);

function getRestAuthUser(req) {
  // Try Authorization: Bearer token first
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    const payload = verifyToken(auth.slice(7));
    if (payload) return payload;
  }
  // Try apikey header (Supabase anon key — skip validation, just allow)
  return null;
}

function parsePostgrestFilters(queryParams, tableName) {
  const where = [];
  const values = [];
  let orderBy = '';
  let limitClause = '';
  let offsetClause = '';
  let selectCols = '*';
  let idx = 1;

  for (const [key, val] of Object.entries(queryParams)) {
    if (key === 'select') {
      if (val && val !== '*') {
        // Handle select with embedded renames and nested selects (just use *)
        if (val.includes('(') || val.includes(':')) {
          selectCols = '*';
        } else {
          const cols = val.split(',').filter(c => /^[a-z_]+$/.test(c.trim()));
          if (cols.length > 0) selectCols = cols.join(', ');
        }
      }
      continue;
    }
    if (key === 'order') {
      const parts = val.split(',').map(p => {
        const [col, dir] = p.split('.');
        if (!/^[a-z_]+$/.test(col)) return null;
        return `${col} ${dir === 'desc' ? 'DESC' : 'ASC'}`;
      }).filter(Boolean);
      if (parts.length) orderBy = ' ORDER BY ' + parts.join(', ');
      continue;
    }
    if (key === 'limit') {
      const n = parseInt(val);
      if (!isNaN(n)) limitClause = ` LIMIT ${n}`;
      continue;
    }
    if (key === 'offset') {
      const n = parseInt(val);
      if (!isNaN(n)) offsetClause = ` OFFSET ${n}`;
      continue;
    }

    // Filter columns
    if (!/^[a-z_]+$/.test(key)) continue;

    if (typeof val === 'string') {
      if (val.startsWith('eq.')) {
        where.push(`${key} = $${idx++}`);
        values.push(val.slice(3));
      } else if (val.startsWith('neq.')) {
        where.push(`${key} != $${idx++}`);
        values.push(val.slice(4));
      } else if (val.startsWith('gt.')) {
        where.push(`${key} > $${idx++}`);
        values.push(val.slice(3));
      } else if (val.startsWith('gte.')) {
        where.push(`${key} >= $${idx++}`);
        values.push(val.slice(4));
      } else if (val.startsWith('lt.')) {
        where.push(`${key} < $${idx++}`);
        values.push(val.slice(3));
      } else if (val.startsWith('lte.')) {
        where.push(`${key} <= $${idx++}`);
        values.push(val.slice(4));
      } else if (val.startsWith('like.')) {
        where.push(`${key} LIKE $${idx++}`);
        values.push(val.slice(5));
      } else if (val.startsWith('ilike.')) {
        where.push(`${key} ILIKE $${idx++}`);
        values.push(val.slice(6));
      } else if (val.startsWith('is.')) {
        const v = val.slice(3);
        if (v === 'null') where.push(`${key} IS NULL`);
        else if (v === 'true') where.push(`${key} IS TRUE`);
        else if (v === 'false') where.push(`${key} IS FALSE`);
      } else if (val.startsWith('not.is.')) {
        const v = val.slice(7);
        if (v === 'null') where.push(`${key} IS NOT NULL`);
      } else if (val.startsWith('in.')) {
        // in.(val1,val2,val3)
        const inner = val.slice(3).replace(/^\(/, '').replace(/\)$/, '');
        const items = inner.split(',').map(s => s.trim().replace(/^"/, '').replace(/"$/, ''));
        if (items.length > 0) {
          const placeholders = items.map(() => `$${idx++}`);
          where.push(`${key} IN (${placeholders.join(',')})`);
          values.push(...items);
        }
      } else if (val.startsWith('not.in.')) {
        const inner = val.slice(7).replace(/^\(/, '').replace(/\)$/, '');
        const items = inner.split(',').map(s => s.trim().replace(/^"/, '').replace(/"$/, ''));
        if (items.length > 0) {
          const placeholders = items.map(() => `$${idx++}`);
          where.push(`${key} NOT IN (${placeholders.join(',')})`);
          values.push(...items);
        }
      }
    }
  }

  // Handle 'or' parameter: or=(col1.eq.val1,col2.eq.val2)
  if (queryParams.or) {
    const orStr = queryParams.or.replace(/^\(/, '').replace(/\)$/, '');
    const orParts = [];
    // Simple parser for or conditions
    const orItems = orStr.split(',');
    for (const item of orItems) {
      const dotIdx = item.indexOf('.');
      if (dotIdx === -1) continue;
      const col = item.slice(0, dotIdx);
      const rest = item.slice(dotIdx + 1);
      if (!/^[a-z_]+$/.test(col)) continue;
      if (rest.startsWith('eq.')) {
        orParts.push(`${col} = $${idx++}`);
        values.push(rest.slice(3));
      } else if (rest.startsWith('neq.')) {
        orParts.push(`${col} != $${idx++}`);
        values.push(rest.slice(4));
      } else if (rest.startsWith('is.null')) {
        orParts.push(`${col} IS NULL`);
      } else if (rest.startsWith('is.true')) {
        orParts.push(`${col} IS TRUE`);
      } else if (rest.startsWith('is.false')) {
        orParts.push(`${col} IS FALSE`);
      }
    }
    if (orParts.length > 0) {
      where.push(`(${orParts.join(' OR ')})`);
    }
  }

  return { selectCols, where, values, orderBy, limitClause, offsetClause, nextIdx: idx };
}

function parseQueryString(url) {
  const qIdx = url.indexOf('?');
  if (qIdx === -1) return {};
  const qs = url.slice(qIdx + 1);
  const params = {};
  for (const pair of qs.split('&')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = decodeURIComponent(pair.slice(0, eqIdx));
    const val = decodeURIComponent(pair.slice(eqIdx + 1));
    params[key] = val;
  }
  return params;
}

function sendRestJson(res, statusCode, data, headers = {}) {
  const allHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer, X-Client-Info',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
    'Access-Control-Expose-Headers': 'Content-Range, X-Total-Count',
    ...headers,
  };
  res.writeHead(statusCode, allHeaders);
  res.end(JSON.stringify(data));
}

async function handlePostgrestRequest(req, res, tableName) {
  if (!POSTGREST_TABLES.has(tableName)) {
    sendRestJson(res, 404, { message: `Table ${tableName} not found`, code: 'PGRST116' });
    return;
  }
  if (!/^[a-z_]+$/.test(tableName)) {
    sendRestJson(res, 400, { message: 'Invalid table name' });
    return;
  }

  const user = getRestAuthUser(req);
  const queryParams = parseQueryString(req.url);
  const prefer = req.headers['prefer'] || '';

  if (req.method === 'GET' || req.method === 'HEAD') {
    try {
      const { selectCols, where, values, orderBy, limitClause, offsetClause, nextIdx } =
        parsePostgrestFilters(queryParams, tableName);

      // Auto-scope by user_id if table has user_id and user is authenticated
      if (user && !NO_USER_SCOPE_TABLES.has(tableName)) {
        // Check if user_id filter is already present
        const hasUserFilter = where.some(w => w.startsWith('user_id '));
        if (!hasUserFilter) {
          where.push(`user_id = $${nextIdx}`);
          values.push(user.sub);
        }
      }

      const whereClause = where.length > 0 ? ' WHERE ' + where.join(' AND ') : '';
      const sql = `SELECT ${selectCols} FROM ${tableName}${whereClause}${orderBy}${limitClause || ' LIMIT 1000'}${offsetClause}`;

      const rows = await query(sql, values);

      if (req.method === 'HEAD') {
        // Return count in header
        const countSql = `SELECT COUNT(*) as cnt FROM ${tableName}${whereClause}`;
        const countRows = await query(countSql, values);
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Content-Range': `0-${rows.length}/${countRows[0].cnt}`,
          'X-Total-Count': String(countRows[0].cnt),
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'Content-Range, X-Total-Count',
        });
        res.end();
        return;
      }

      // Check Prefer header for count
      if (prefer.includes('count=exact')) {
        const countSql = `SELECT COUNT(*) as cnt FROM ${tableName}${whereClause}`;
        const countRows = await query(countSql, values);
        sendRestJson(res, 200, rows, {
          'Content-Range': `0-${rows.length}/${countRows[0].cnt}`,
        });
      } else {
        sendRestJson(res, 200, rows);
      }
    } catch (err) {
      console.error(`PostgREST GET ${tableName} error:`, err.message);
      sendRestJson(res, 500, { message: err.message });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const rows = Array.isArray(body) ? body : [body];
      if (!rows.length) { sendRestJson(res, 201, []); return; }

      // Require authentication for inserts on user-scoped tables
      if (!user && !NO_USER_SCOPE_TABLES.has(tableName)) {
        sendRestJson(res, 401, { message: 'Authentication required. Please log in again.', code: 'AUTH_REQUIRED' });
        return;
      }

      const validColumns = await getTableColumns(tableName);
      const results = [];

      for (const row of rows) {
        if (user && !NO_USER_SCOPE_TABLES.has(tableName) && !row.user_id) {
          row.user_id = user.sub;
        }
        if (!row.id) row.id = uuid();
        delete row.search_vector;

        const cleaned = filterRowColumns(row, validColumns);
        const keys = Object.keys(cleaned);
        if (!keys.length) continue;
        const vals = keys.map((_, i) => `$${i + 1}`);

        // Check for upsert via Prefer header
        if (prefer.includes('resolution=merge-duplicates')) {
          const updates = keys.filter(k => k !== 'id').map(k => `${k} = EXCLUDED.${k}`).join(', ');
          const inserted = await query(
            `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT (id) DO UPDATE SET ${updates} RETURNING *`,
            keys.map(k => cleaned[k])
          );
          if (inserted.length) results.push(inserted[0]);
        } else {
          const inserted = await query(
            `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${vals.join(', ')}) RETURNING *`,
            keys.map(k => cleaned[k])
          );
          if (inserted.length) results.push(inserted[0]);
        }
      }

      const returnMinimal = prefer.includes('return=minimal');
      if (returnMinimal) {
        sendRestJson(res, 201, null);
      } else {
        sendRestJson(res, 201, results.length === 1 && !Array.isArray(body) ? results[0] : results);
      }
    } catch (err) {
      console.error(`PostgREST POST ${tableName} error:`, err.message);
      sendRestJson(res, 500, { message: err.message, details: err.detail || '' });
    }
    return;
  }

  if (req.method === 'PATCH') {
    try {
      const body = await parseBody(req);
      const { where, values, nextIdx } = parsePostgrestFilters(queryParams, tableName);

      // Auto-scope by user_id
      if (user && !NO_USER_SCOPE_TABLES.has(tableName)) {
        const hasUserFilter = where.some(w => w.startsWith('user_id '));
        if (!hasUserFilter) {
          where.push(`user_id = $${nextIdx}`);
          values.push(user.sub);
        }
      }

      const setClauses = [];
      const setValues = [];
      let setIdx = values.length + 1;
      const validColumns = await getTableColumns(tableName);

      for (const [key, val] of Object.entries(body)) {
        if (key === 'id' || key === 'search_vector') continue;
        if (!/^[a-z_]+$/.test(key)) continue;
        if (validColumns && !validColumns.has(key)) continue;
        setClauses.push(`${key} = $${setIdx++}`);
        setValues.push(val);
      }

      if (!setClauses.length) {
        sendRestJson(res, 200, []);
        return;
      }

      const whereClause = where.length > 0 ? ' WHERE ' + where.join(' AND ') : '';
      const allValues = [...values, ...setValues];
      const result = await query(
        `UPDATE ${tableName} SET ${setClauses.join(', ')}${whereClause} RETURNING *`,
        allValues
      );

      sendRestJson(res, 200, result);
    } catch (err) {
      console.error(`PostgREST PATCH ${tableName} error:`, err.message);
      sendRestJson(res, 500, { message: err.message });
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      const { where, values, nextIdx } = parsePostgrestFilters(queryParams, tableName);

      // Auto-scope by user_id
      if (user && !NO_USER_SCOPE_TABLES.has(tableName)) {
        const hasUserFilter = where.some(w => w.startsWith('user_id '));
        if (!hasUserFilter) {
          where.push(`user_id = $${nextIdx}`);
          values.push(user.sub);
        }
      }

      const whereClause = where.length > 0 ? ' WHERE ' + where.join(' AND ') : '';
      const result = await query(
        `DELETE FROM ${tableName}${whereClause} RETURNING *`,
        values
      );

      sendRestJson(res, 200, result);
    } catch (err) {
      console.error(`PostgREST DELETE ${tableName} error:`, err.message);
      sendRestJson(res, 500, { message: err.message });
    }
    return;
  }

  sendRestJson(res, 405, { message: 'Method not allowed' });
}

async function handleRpcCall(req, res, funcName) {
  if (funcName === 'get_support_users_safe') {
    try {
      const rows = await query(
        `SELECT id, user_id, department_id, name, email, phone, designation, device_info,
                ip_address, notes, is_active, created_at, updated_at, extension_number,
                nas_username, device_handover_date, device_assign_date, new_device_assign
         FROM support_users ORDER BY name`
      );
      sendRestJson(res, 200, rows);
    } catch (err) {
      sendRestJson(res, 500, { message: err.message });
    }
    return;
  }
  // Unknown RPC — return empty result
  sendRestJson(res, 200, []);
}

// --- HTTP Server ---
const server = http.createServer(async (req, res) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, Prefer, X-Client-Info',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
        'Access-Control-Expose-Headers': 'Content-Range, X-Total-Count',
      });
      res.end();
      return;
    }

    // Health endpoint — always available, even before DB is ready
    const urlPath = req.url.split('?')[0];
    if (req.method === 'GET' && urlPath === '/api/health') {
      sendJson(res, 200, {
        status: appState.status,
        message: appState.message,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // --- PostgREST proxy routes ---
    if (urlPath.startsWith('/rest/v1/rpc/')) {
      const funcName = urlPath.slice('/rest/v1/rpc/'.length);
      if (appState.status === 'starting') {
        sendRestJson(res, 503, { message: 'Backend starting' });
        return;
      }
      await handleRpcCall(req, res, funcName);
      return;
    }

    if (urlPath.startsWith('/rest/v1/')) {
      const tableName = urlPath.slice('/rest/v1/'.length).split('?')[0];
      if (appState.status === 'starting') {
        sendRestJson(res, 503, { message: 'Backend starting' });
        return;
      }
      if (!dbClient) {
        sendRestJson(res, 503, { message: 'Database not connected' });
        return;
      }
      await handlePostgrestRequest(req, res, tableName);
      return;
    }

    // --- Auth proxy routes (Supabase client auth calls) ---
    if (urlPath.startsWith('/auth/v1/')) {
      // The Supabase client may call /auth/v1/token, /auth/v1/user, etc.
      // In Docker mode, auth is handled by our custom system, so return appropriate responses
      if (urlPath === '/auth/v1/token' && req.method === 'POST') {
        // Supabase client login — return a "not supported" so the app falls back to self-hosted auth
        sendRestJson(res, 400, { error: 'self_hosted_mode', error_description: 'Use /api/auth/login for self-hosted authentication' });
        return;
      }
      if (urlPath === '/auth/v1/user' && req.method === 'GET') {
        const user = getRestAuthUser(req);
        if (user) {
          sendRestJson(res, 200, { id: user.sub, email: user.email, role: 'authenticated' });
        } else {
          sendRestJson(res, 401, { message: 'Not authenticated' });
        }
        return;
      }
      // Default: return empty success for other auth endpoints
      sendRestJson(res, 200, {});
      return;
    }

    // --- Edge functions stub (graceful fallback) ---
    if (urlPath.startsWith('/functions/v1/')) {
      const funcName = urlPath.replace('/functions/v1/', '').split('/')[0].split('?')[0];
      
      // Function-specific responses for known edge functions
      const functionResponses = {
        'send-task-reminders': { success: true, message: 'Task reminders processed (local mode)', sent: 0 },
        'send-habit-reminders': { success: true, message: 'Habit reminders processed (local mode)', sent: 0 },
        'send-family-event-reminders': { success: true, message: 'Event reminders processed (local mode)', sent: 0 },
        'send-loan-reminders': { success: true, message: 'Loan reminders processed (local mode)', sent: 0 },
        'send-push-notification': { success: true, message: 'Push notification skipped (local mode)' },
        'send-email-notification': { success: true, message: 'Email notification skipped (local mode)' },
        'send-email-otp': { success: true, message: 'Email OTP skipped (local mode)' },
        'send-smtp-email': { success: true, message: 'SMTP email skipped (local mode)' },
        'send-task-assignment-notification': { success: true, message: 'Assignment notification skipped (local mode)' },
        'google-calendar-sync': { success: true, message: 'Google Calendar sync not available in local mode', events: [] },
        'microsoft-calendar-sync': { success: true, message: 'Microsoft Calendar sync not available in local mode', events: [] },
        'save-calendar-credentials': { success: true, message: 'Calendar credentials not supported in local mode' },
        'manage-resend-key': { success: true, message: 'Resend API not available in local mode' },
        'ai-assist': { success: true, content: 'AI features require cloud mode or a configured API key.', provider: 'local', error: 'AI not available in self-hosted mode' },
      };

      const response = functionResponses[funcName] || { success: true, message: `Edge function '${funcName}' not available in self-hosted mode` };
      sendRestJson(res, 200, response);
      return;
    }

    // If backend is still starting, reject non-health requests
    if (appState.status === 'starting') {
      sendJson(res, 503, {
        message: 'Backend is still starting up. Please wait...',
        status: 'starting',
      });
      return;
    }

    // Setup enforcement — block everything until setup is complete
    const setupOk = await checkSetupMiddleware(req);
    if (!setupOk) {
      sendJson(res, 403, {
        message: 'Setup not complete. Please complete the setup wizard first.',
        needs_setup: true,
      });
      return;
    }

    // License enforcement
    const licenseOk = await checkLicenseMiddleware(req);
    if (!licenseOk) {
      sendJson(res, 403, {
        message: 'License is not active. Please configure a valid license.',
        license_status: licenseCache.status,
        license_message: licenseCache.message,
      });
      return;
    }

    const routeKey = `${req.method} ${urlPath}`;
    let handler = routes[routeKey];

    // Parameterized route matching for /api/data/:table
    if (!handler && urlPath.startsWith('/api/data/')) {
      const parts = urlPath.split('/'); // ['', 'api', 'data', tableName, ...rest]
      const tableName = parts[3];
      const subAction = parts[4]; // 'upsert' or 'update' or undefined
      if (tableName) {
        if (subAction === 'upsert' && req.method === 'POST') {
          handler = (rq, rs) => handleDataUpsert(rq, rs, tableName);
        } else if (subAction === 'update' && req.method === 'POST') {
          handler = (rq, rs) => handleDataUpdate(rq, rs, tableName);
        } else if (!subAction && req.method === 'GET') {
          handler = (rq, rs) => handleDataSelect(rq, rs, tableName);
        } else if (!subAction && req.method === 'POST') {
          handler = (rq, rs) => handleDataInsert(rq, rs, tableName);
        } else if (!subAction && req.method === 'DELETE') {
          handler = (rq, rs) => handleDataDelete(rq, rs, tableName);
        }
      }
    }

    if (handler) {
      try {
        await handler(req, res);
      } catch (err) {
        console.error(`Route error [${routeKey}]:`, err);
        if (!res.headersSent) {
          sendJson(res, 500, { message: err.message });
        }
      }
    } else {
      sendJson(res, 404, { message: 'Not found' });
    }
  } catch (err) {
    console.error('Unhandled request error:', err);
    if (!res.headersSent) {
      sendJson(res, 500, { message: 'Internal server error' });
    }
  }
});

// --- Generic CRUD Data Handlers for Backup/Restore ---
const ALLOWED_DATA_TABLES = new Set([
  'tasks', 'notes', 'transactions', 'goals', 'investments', 'projects',
  'salary_entries', 'habits', 'family_members', 'family_events',
  'budgets', 'budget_categories', 'task_categories',
  'habit_completions', 'goal_milestones', 'project_milestones',
  'task_checklists', 'task_follow_up_notes', 'task_assignments',
  'family_member_connections', 'family_documents',
  'loan_payments', 'device_service_history', 'backup_schedules',
  'loans', 'profiles', 'support_users', 'support_units', 'support_departments',
  'support_user_devices', 'device_inventory', 'device_categories',
  'device_suppliers', 'device_disposals', 'device_transfer_history',
  'support_tickets', 'ticket_categories', 'ticket_comments',
  'ticket_activity_log', 'ticket_requesters', 'ticket_form_fields',
  'attachments', 'smtp_settings', 'app_secrets',
  'google_calendar_sync', 'synced_calendar_events',
  'push_subscriptions', 'email_otp_codes', 'audit_logs',
  'qr_code_settings', 'user_roles',
  'ai_config', 'app_notifications', 'notification_preferences',
  'pomodoro_settings', 'time_entries', 'custom_form_fields',
  'form_field_config', 'module_config',
  'workflow_rules', 'workflow_logs', 'webhook_configs', 'task_templates',
  'user_mfa_settings', 'user_workspace_permissions',
]);

function validateTable(tableName) {
  if (!ALLOWED_DATA_TABLES.has(tableName)) {
    return false;
  }
  // Extra safety: ensure no SQL injection via table name
  return /^[a-z_]+$/.test(tableName);
}

// Cache of valid columns per table to avoid repeated schema queries
const tableColumnsCache = {};

async function getTableColumns(tableName) {
  if (tableColumnsCache[tableName]) return tableColumnsCache[tableName];
  try {
    let rows;
    if (dbType === 'postgresql') {
      rows = await query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
        [tableName]
      );
    } else {
      rows = await query(
        "SELECT COLUMN_NAME as column_name FROM information_schema.columns WHERE table_name = ?",
        [tableName]
      );
    }
    const cols = new Set(rows.map(r => r.column_name));
    tableColumnsCache[tableName] = cols;
    return cols;
  } catch (err) {
    console.error(`Failed to get columns for ${tableName}:`, err.message);
    return null; // Return null to skip filtering
  }
}

// Strip keys from a row that don't exist as columns in the target table
function filterRowColumns(row, validColumns) {
  if (!validColumns) return row; // If we couldn't fetch columns, pass through
  const filtered = {};
  for (const key of Object.keys(row)) {
    if (validColumns.has(key)) {
      filtered[key] = row[key];
    }
  }
  return filtered;
}

// Tables that should NOT be scoped by user_id in data API
const DATA_NO_USER_SCOPE = new Set([
  'support_units', 'support_departments', 'support_users',
  'device_categories', 'device_suppliers', 'device_inventory', 'device_service_history',
  'user_roles', 'app_settings', 'ticket_categories', 'ticket_form_fields',
  'ticket_requesters',
  'device_transfer_history', 'form_field_config', 'module_config',
  'support_tickets', 'ticket_comments', 'ticket_activity_log',
]);

async function handleDataSelect(req, res, tableName) {
  if (!validateTable(tableName)) {
    sendJson(res, 400, { message: `Invalid table: ${tableName}` });
    return;
  }
  const user = getAuthUser(req);
  if (!user) { sendJson(res, 401, { message: 'Not authenticated' }); return; }

  try {
    let rows;
    if (DATA_NO_USER_SCOPE.has(tableName)) {
      rows = await query(`SELECT * FROM ${tableName}`);
    } else {
      rows = await query(`SELECT * FROM ${tableName} WHERE user_id = $1`, [user.sub]);
    }
    sendJson(res, 200, { data: rows });
  } catch (err) {
    sendJson(res, 500, { message: err.message });
  }
}

async function handleDataInsert(req, res, tableName) {
  if (!validateTable(tableName)) {
    sendJson(res, 400, { message: `Invalid table: ${tableName}` });
    return;
  }
  const user = getAuthUser(req);
  if (!user) { sendJson(res, 401, { message: 'Not authenticated' }); return; }

  try {
    const body = await parseBody(req);
    const rows = body.rows || [];
    if (!rows.length) { sendJson(res, 200, { inserted: 0 }); return; }

    const validColumns = await getTableColumns(tableName);
    const isSharedTable = DATA_NO_USER_SCOPE.has(tableName);
    let inserted = 0;
    for (const row of rows) {
      if (!isSharedTable) {
        row.user_id = user.sub;
      }
      if (!row.id) row.id = uuid();
      delete row.search_vector;

      const cleaned = filterRowColumns(row, validColumns);
      const keys = Object.keys(cleaned);
      if (!keys.length) continue;
      const vals = keys.map((_, i) => `$${i + 1}`);
      await query(
        `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${vals.join(', ')})`,
        keys.map(k => cleaned[k])
      );
      inserted++;
    }
    sendJson(res, 200, { inserted });
  } catch (err) {
    sendJson(res, 500, { message: err.message });
  }
}

async function handleDataUpsert(req, res, tableName) {
  if (!validateTable(tableName)) {
    sendJson(res, 400, { message: `Invalid table: ${tableName}` });
    return;
  }
  const user = getAuthUser(req);
  if (!user) { sendJson(res, 401, { message: 'Not authenticated' }); return; }

  try {
    const body = await parseBody(req);
    const rows = body.rows || [];
    if (!rows.length) { sendJson(res, 200, { upserted: 0 }); return; }

    const validColumns = await getTableColumns(tableName);
    const isSharedTable = DATA_NO_USER_SCOPE.has(tableName);
    let upserted = 0;
    for (const row of rows) {
      // Only set user_id for user-scoped tables
      if (!isSharedTable) {
        row.user_id = user.sub;
      }
      if (!row.id) row.id = uuid();
      delete row.search_vector;
      // Preserve created_at/updated_at from import data (don't strip them)

      const cleaned = filterRowColumns(row, validColumns);
      const keys = Object.keys(cleaned);
      if (!keys.length) continue;
      const vals = keys.map((_, i) => `$${i + 1}`);

      if (dbType === 'postgresql') {
        const updates = keys.filter(k => k !== 'id').map(k => `${k} = EXCLUDED.${k}`).join(', ');
        await query(
          `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${vals.join(', ')}) ON CONFLICT (id) DO UPDATE SET ${updates}`,
          keys.map(k => cleaned[k])
        );
      } else {
        const updates = keys.filter(k => k !== 'id').map(k => `${k} = VALUES(${k})`).join(', ');
        await query(
          `INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${vals.join(', ')}) ON DUPLICATE KEY UPDATE ${updates}`,
          keys.map(k => cleaned[k])
        );
      }
      upserted++;
    }
    sendJson(res, 200, { upserted });
  } catch (err) {
    sendJson(res, 500, { message: err.message });
  }
}

async function handleDataDelete(req, res, tableName) {
  if (!validateTable(tableName)) {
    sendJson(res, 400, { message: `Invalid table: ${tableName}` });
    return;
  }
  const user = getAuthUser(req);
  if (!user) { sendJson(res, 401, { message: 'Not authenticated' }); return; }

  try {
    if (DATA_NO_USER_SCOPE.has(tableName)) {
      await query(`DELETE FROM ${tableName}`);
    } else {
      await query(`DELETE FROM ${tableName} WHERE user_id = $1`, [user.sub]);
    }
    sendJson(res, 200, { success: true });
  } catch (err) {
    sendJson(res, 500, { message: err.message });
  }
}

async function handleDataUpdate(req, res, tableName) {
  if (!validateTable(tableName)) {
    sendJson(res, 400, { message: `Invalid table: ${tableName}` });
    return;
  }
  const user = getAuthUser(req);
  if (!user) { sendJson(res, 401, { message: 'Not authenticated' }); return; }

  try {
    const body = await parseBody(req);
    const { updates, filters } = body;
    // updates: { column: value }, filters: { column: value }
    if (!updates || !Object.keys(updates).length) {
      sendJson(res, 400, { message: 'No updates provided' });
      return;
    }

    const setClauses = [];
    const params = [];
    let idx = 1;
    for (const [key, val] of Object.entries(updates)) {
      if (/^[a-z_]+$/.test(key)) {
        setClauses.push(`${key} = $${idx++}`);
        params.push(val);
      }
    }

    let whereClauses = [];
    if (!DATA_NO_USER_SCOPE.has(tableName)) {
      whereClauses.push(`user_id = $${idx++}`);
      params.push(user.sub);
    }

    if (filters) {
      for (const [key, val] of Object.entries(filters)) {
        if (/^[a-z_]+$/.test(key)) {
          if (val === null) {
            whereClauses.push(`${key} IS NOT NULL`);
          } else {
            whereClauses.push(`${key} = $${idx++}`);
            params.push(val);
          }
        }
      }
    }

    await query(
      `UPDATE ${tableName} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`,
      params
    );
    sendJson(res, 200, { success: true });
  } catch (err) {
    sendJson(res, 500, { message: err.message });
  }
}

// --- Seed Default Admin ---
async function seedDefaultAdmin() {
  try {
    // Skip seeding if admin was already created through the setup wizard
    const wizardCreated = await getLicenseSetting('wizard_admin_created');
    if (wizardCreated === 'true') {
      console.log('✅ Admin already configured via setup wizard — skipping default seed.');
      return;
    }

    // Check if any admin exists already
    const existingAdmins = await query("SELECT COUNT(*) as cnt FROM user_roles WHERE role = 'admin'");
    if (parseInt(existingAdmins[0].cnt) > 0) {
      console.log('✅ Admin user already exists — skipping default seed.');
      // Ensure setup_complete is true
      await query(
        dbType === 'postgresql'
          ? `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', true, $1) ON CONFLICT (id) DO UPDATE SET setup_complete = true`
          : `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', true, ?) ON DUPLICATE KEY UPDATE setup_complete = true`,
        [dbType]
      );
      return;
    }

    // Use env vars for headless setup if provided
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@lifeos.local';
    const adminPassword = process.env.ADMIN_PASSWORD || 'LifeOS@2024!';
    const passwordHash = hashPassword(adminPassword);

    // Upsert admin user
    const adminId = uuid();
    if (dbType === 'postgresql') {
      await query(
        `INSERT INTO users (id, email, password_hash, full_name, email_verified) 
         VALUES ($1, $2, $3, 'System Administrator', true)
         ON CONFLICT (email) DO UPDATE SET password_hash = $3`,
        [adminId, adminEmail, passwordHash]
      );
    } else {
      await query(
        `INSERT INTO users (id, email, password_hash, full_name, email_verified) 
         VALUES (?, ?, ?, 'System Administrator', true)
         ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
        [adminId, adminEmail, passwordHash]
      );
    }

    // Get the actual admin user id (may differ if user already existed)
    const adminRows = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    const realAdminId = adminRows[0].id;

    // Ensure admin role
    if (dbType === 'postgresql') {
      await query(
        `INSERT INTO user_roles (id, user_id, role) VALUES ($1, $2, 'admin'::app_role) ON CONFLICT (user_id, role) DO NOTHING`,
        [uuid(), realAdminId]
      );
      await query(
        `INSERT INTO profiles (id, user_id, full_name, email) VALUES ($1, $2, 'System Administrator', $3)
         ON CONFLICT (user_id) DO UPDATE SET full_name = 'System Administrator', email = $3`,
        [uuid(), realAdminId, adminEmail]
      );
      await query(
        `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', true, $1)
         ON CONFLICT (id) DO UPDATE SET setup_complete = true`,
        [dbType]
      );
    } else {
      await query(
        `INSERT IGNORE INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')`,
        [uuid(), realAdminId]
      );
      await query(
        `INSERT INTO profiles (id, user_id, full_name, email) VALUES (?, ?, 'System Administrator', ?)
         ON DUPLICATE KEY UPDATE full_name = 'System Administrator', email = VALUES(email)`,
        [uuid(), realAdminId, adminEmail]
      );
      await query(
        `INSERT INTO app_settings (id, setup_complete, db_type) VALUES ('default', true, ?)
         ON DUPLICATE KEY UPDATE setup_complete = true`,
        [dbType]
      );
    }

    console.log(`✅ Admin user seeded: ${adminEmail}`);
  } catch (err) {
    console.error('❌ Error seeding admin:', err.message);
    throw err; // Re-throw so retry logic can catch it
  }
}

// --- Ensure Schema Exists ---
async function ensureSchema() {
  try {
    // Check if app_settings table exists
    if (dbType === 'postgresql') {
      const check = await query(
        "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_settings') AS exists"
      );
      if (!check[0].exists) {
        console.log('Running schema initialization...');
        const schema = PG_SCHEMA;
        const statements = schema.split(';').filter((s) => s.trim());
        for (const stmt of statements) {
          if (stmt.trim()) await query(stmt + ';');
        }
        console.log('Schema initialized successfully');
      }
    } else {
      const check = await query(
        "SELECT COUNT(*) as cnt FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'app_settings'"
      );
      if (check[0].cnt === 0) {
        console.log('Running schema initialization...');
        const schema = MYSQL_SCHEMA;
        const statements = schema.split(';').filter((s) => s.trim());
        for (const stmt of statements) {
          if (stmt.trim()) await query(stmt + ';');
        }
        console.log('Schema initialized successfully');
      }
    }
  } catch (err) {
    console.error('Error ensuring schema:', err.message);
  }
}

// --- Startup with Retry ---
async function connectWithRetry(maxRetries = 10, delayMs = 3000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      dbClient = await connectDatabase({});
      console.log(`✅ Connected to ${dbType} database (attempt ${attempt})`);
      return true;
    } catch (err) {
      console.log(`⏳ DB connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }
  return false;
}

async function initializeDatabase() {
  if (!process.env.DB_HOST) {
    console.log('No database configured. Setup wizard will guide you.');
    appState = { status: 'ready', message: 'Waiting for setup wizard' };
    return;
  }

  try {
    const connected = await connectWithRetry();
    if (connected) {
      try {
        await ensureSchema();
        console.log('✅ Schema verified');
      } catch (err) {
        console.error('❌ Schema init failed:', err.message);
      }
      try {
        await seedDefaultAdmin();
      } catch (err) {
        console.error('❌ Admin seeding failed after retries:', err.message);
      }

      // Auto-verify license on startup
      try {
        await loadLicenseCache();
        const envKey = process.env.APP_LICENSE_KEY;
        const storedKey = await getLicenseSetting('app_license_key');
        const licenseKey = envKey || storedKey;

        if (licenseKey) {
          if (envKey && envKey !== storedKey) {
            await setLicenseSetting('app_license_key', envKey);
          }
          console.log('🔑 Verifying license on startup...');
          const result = await verifyLicenseWithPortal(licenseKey, true);
          console.log(`🔑 License status: ${result.status} - ${result.message}`);

          const RECHECK_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;
          setInterval(async () => {
            try {
              const currentKey = await getLicenseSetting('app_license_key');
              if (currentKey) {
                console.log('🔄 Periodic license re-verification...');
                const recheckResult = await verifyLicenseWithPortal(currentKey, true);
                console.log(`🔄 License recheck: ${recheckResult.status} - ${recheckResult.message}`);
              }
            } catch (recheckErr) {
              console.error('⚠️ Periodic license recheck failed:', recheckErr.message);
            }
          }, RECHECK_INTERVAL_MS);
          console.log('⏰ Periodic license re-check scheduled (every 30 days)');
        } else {
          console.log('⚠️ No license key configured.');
        }
      } catch (err) {
        console.error('⚠️ License check on startup failed:', err.message);
      }

      appState = { status: 'ready', message: 'Backend is ready' };
      console.log('✅ Backend initialization complete — ready to serve requests');
    } else {
      console.error('❌ Could not connect to database after all retries');
      appState = { status: 'error', message: 'Database connection failed' };
    }
  } catch (err) {
    console.error('❌ Initialization error:', err.message);
    appState = { status: 'error', message: err.message };
  }
}

// --- Start: listen FIRST, then initialize DB in background ---
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ LifeOS API server listening on port ${PORT}`);
  initializeDatabase();
});
