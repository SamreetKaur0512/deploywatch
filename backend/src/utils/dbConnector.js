/**
 * Universal DB Connector
 * Supports: MongoDB, MySQL, PostgreSQL, Firebase, Supabase
 * Developer gives connection string + db type — we handle the rest
 */

const mongoose = require('mongoose');

// Connection cache
const cache = {};

// ── MongoDB ──────────────────────────────────────────────────
const connectMongo = async (uri) => {
  if (cache[`mongo_${uri}`]) return cache[`mongo_${uri}`];
  const conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 8000 });
  cache[`mongo_${uri}`] = conn;
  return conn;
};

const mongoFetchUsers = async (uri, collection, { search, page, limit }) => {
  const conn = await connectMongo(uri);
  const schema = new mongoose.Schema({}, { strict: false });
  let Model;
  try { Model = conn.model(collection); }
  catch { Model = conn.model(collection, schema, collection); }

  const query = search
    ? { $or: [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }] }
    : {};
  const total = await Model.countDocuments(query);
  const users = await Model.find(query)
    .select('-password -passwordHash -passwd -pwd -hash -salt -tokens')
    .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
  return { users, total };
};

const mongoUpdateUser = async (uri, collection, userId, updates) => {
  const conn = await connectMongo(uri);
  const schema = new mongoose.Schema({}, { strict: false });
  let Model;
  try { Model = conn.model(collection); }
  catch { Model = conn.model(collection, schema, collection); }
  return await Model.findByIdAndUpdate(userId, { $set: updates }, { new: true })
    .select('-password -passwordHash -passwd -pwd -hash -salt').lean();
};

const mongoBlockUser = async (uri, collection, userId, block) => {
  return await mongoUpdateUser(uri, collection, userId, {
    isActive: !block, isBlocked: block, blocked: block,
    status: block ? 'blocked' : 'active',
  });
};

const mongoDeleteUser = async (uri, collection, userId) => {
  const conn = await connectMongo(uri);
  const schema = new mongoose.Schema({}, { strict: false });
  let Model;
  try { Model = conn.model(collection); }
  catch { Model = conn.model(collection, schema, collection); }
  return await Model.findByIdAndDelete(userId);
};

// ── MySQL ────────────────────────────────────────────────────
const getMySQLConn = async (uri) => {
  if (cache[`mysql_${uri}`]) return cache[`mysql_${uri}`];
  const mysql = require('mysql2/promise');
  const conn = await mysql.createConnection(uri);
  cache[`mysql_${uri}`] = conn;
  return conn;
};

const mysqlFetchUsers = async (uri, table, { search, page, limit }) => {
  const conn = await getMySQLConn(uri);
  const offset = (page - 1) * limit;
  const where = search ? `WHERE name LIKE ? OR email LIKE ?` : '';
  const params = search ? [`%${search}%`, `%${search}%`] : [];

  const [[{ total }]] = await conn.execute(
    `SELECT COUNT(*) as total FROM \`${table}\` ${where}`, params
  );
  const [users] = await conn.execute(
    `SELECT id, name, email, role, created_at, is_active, is_blocked FROM \`${table}\` ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { users, total };
};

const mysqlUpdateUser = async (uri, table, userId, updates) => {
  const conn = await getMySQLConn(uri);
  const safe = { ...updates };
  delete safe.password; delete safe.password_hash;
  const fields = Object.keys(safe).map(k => `\`${k}\` = ?`).join(', ');
  const values = [...Object.values(safe), userId];
  await conn.execute(`UPDATE \`${table}\` SET ${fields} WHERE id = ?`, values);
  const [[user]] = await conn.execute(`SELECT id, name, email, role, created_at FROM \`${table}\` WHERE id = ?`, [userId]);
  return user;
};

const mysqlBlockUser = async (uri, table, userId, block) => {
  return await mysqlUpdateUser(uri, table, userId, { is_active: block ? 0 : 1, is_blocked: block ? 1 : 0 });
};

const mysqlDeleteUser = async (uri, table, userId) => {
  const conn = await getMySQLConn(uri);
  await conn.execute(`DELETE FROM \`${table}\` WHERE id = ?`, [userId]);
  return { deleted: true };
};

// ── PostgreSQL ───────────────────────────────────────────────
const getPGConn = async (uri) => {
  if (cache[`pg_${uri}`]) return cache[`pg_${uri}`];
  const { Client } = require('pg');
  const client = new Client({ connectionString: uri });
  await client.connect();
  cache[`pg_${uri}`] = client;
  return client;
};

const pgFetchUsers = async (uri, table, { search, page, limit }) => {
  const client = await getPGConn(uri);
  const offset = (page - 1) * limit;
  let query, countQuery, params;

  if (search) {
    countQuery = `SELECT COUNT(*) FROM "${table}" WHERE name ILIKE $1 OR email ILIKE $1`;
    query = `SELECT id, name, email, role, created_at, is_active FROM "${table}" WHERE name ILIKE $1 OR email ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
    params = [`%${search}%`, limit, offset];
  } else {
    countQuery = `SELECT COUNT(*) FROM "${table}"`;
    query = `SELECT id, name, email, role, created_at, is_active FROM "${table}" ORDER BY created_at DESC LIMIT $1 OFFSET $2`;
    params = [limit, offset];
  }

  const { rows: countRows } = await client.query(search ? countQuery : countQuery, search ? [`%${search}%`] : []);
  const { rows: users } = await client.query(query, params);
  return { users, total: parseInt(countRows[0].count) };
};

const pgUpdateUser = async (uri, table, userId, updates) => {
  const client = await getPGConn(uri);
  const safe = { ...updates };
  delete safe.password; delete safe.password_hash;
  const fields = Object.keys(safe).map((k, i) => `"${k}" = $${i + 1}`).join(', ');
  const values = [...Object.values(safe), userId];
  await client.query(`UPDATE "${table}" SET ${fields} WHERE id = $${values.length}`, values);
  const { rows } = await client.query(`SELECT id, name, email, role FROM "${table}" WHERE id = $1`, [userId]);
  return rows[0];
};

const pgBlockUser = async (uri, table, userId, block) => {
  return await pgUpdateUser(uri, table, userId, { is_active: !block, is_blocked: block });
};

const pgDeleteUser = async (uri, table, userId) => {
  const client = await getPGConn(uri);
  await client.query(`DELETE FROM "${table}" WHERE id = $1`, [userId]);
  return { deleted: true };
};

// ── Firebase ─────────────────────────────────────────────────
const getFirebaseApp = (credentialsJson) => {
  const key = `firebase_${credentialsJson.slice(0, 30)}`;
  if (cache[key]) return cache[key];
  const admin = require('firebase-admin');
  const serviceAccount = JSON.parse(credentialsJson);
  const app = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) }, key);
  cache[key] = app;
  return app;
};

const firebaseFetchUsers = async (credentialsJson, { page, limit }) => {
  const admin = require('firebase-admin');
  const app = getFirebaseApp(credentialsJson);
  const listResult = await admin.auth(app).listUsers(limit);
  const users = listResult.users.map(u => ({
    _id: u.uid, name: u.displayName || '', email: u.email || '',
    avatar: u.photoURL || '', isDisabled: u.disabled,
    createdAt: u.metadata.creationTime,
  }));
  return { users, total: users.length };
};

const firebaseBlockUser = async (credentialsJson, userId, block) => {
  const admin = require('firebase-admin');
  const app = getFirebaseApp(credentialsJson);
  await admin.auth(app).updateUser(userId, { disabled: block });
  return { _id: userId, isDisabled: block };
};

const firebaseDeleteUser = async (credentialsJson, userId) => {
  const admin = require('firebase-admin');
  const app = getFirebaseApp(credentialsJson);
  await admin.auth(app).deleteUser(userId);
  return { deleted: true };
};

// ── Supabase ─────────────────────────────────────────────────
const getSupabaseClient = (url, key) => {
  const cacheKey = `supabase_${url}`;
  if (cache[cacheKey]) return cache[cacheKey];
  const { createClient } = require('@supabase/supabase-js');
  const client = createClient(url, key);
  cache[cacheKey] = client;
  return client;
};

const supabaseFetchUsers = async (url, serviceKey, table, { search, page, limit }) => {
  const supabase = getSupabaseClient(url, serviceKey);
  let query = supabase.from(table).select('id, name, email, role, created_at, is_active', { count: 'exact' });
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  const { data: users, count, error } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
  if (error) throw new Error(error.message);
  return { users, total: count };
};

const supabaseBlockUser = async (url, serviceKey, table, userId, block) => {
  const supabase = getSupabaseClient(url, serviceKey);
  const { data, error } = await supabase.from(table).update({ is_active: !block, is_blocked: block }).eq('id', userId).select().single();
  if (error) throw new Error(error.message);
  return data;
};

const supabaseDeleteUser = async (url, serviceKey, table, userId) => {
  const supabase = getSupabaseClient(url, serviceKey);
  const { error } = await supabase.from(table).delete().eq('id', userId);
  if (error) throw new Error(error.message);
  return { deleted: true };
};

// ── Universal Dispatcher ─────────────────────────────────────
const fetchUsers = async (dbType, credentials, table, options) => {
  switch (dbType) {
    case 'mongodb':   return await mongoFetchUsers(credentials.uri, table, options);
    case 'mysql':     return await mysqlFetchUsers(credentials.uri, table, options);
    case 'postgresql':return await pgFetchUsers(credentials.uri, table, options);
    case 'firebase':  return await firebaseFetchUsers(credentials.serviceAccount, options);
    case 'supabase':  return await supabaseFetchUsers(credentials.url, credentials.serviceKey, table, options);
    case 'sqlite':     return await sqliteFetchUsers(credentials.filePath, table, options);
    default: throw new Error(`Unsupported database type: ${dbType}`);
  }
};

const updateUser = async (dbType, credentials, table, userId, updates) => {
  switch (dbType) {
    case 'mongodb':   return await mongoUpdateUser(credentials.uri, table, userId, updates);
    case 'mysql':     return await mysqlUpdateUser(credentials.uri, table, userId, updates);
    case 'postgresql':return await pgUpdateUser(credentials.uri, table, userId, updates);
    case 'sqlite':    return await sqliteUpdateUser(credentials.filePath, table, userId, updates);
    default: throw new Error(`Update not supported for ${dbType}`);
  }
};

const blockUser = async (dbType, credentials, table, userId, block) => {
  switch (dbType) {
    case 'mongodb':   return await mongoBlockUser(credentials.uri, table, userId, block);
    case 'mysql':     return await mysqlBlockUser(credentials.uri, table, userId, block);
    case 'postgresql':return await pgBlockUser(credentials.uri, table, userId, block);
    case 'firebase':  return await firebaseBlockUser(credentials.serviceAccount, userId, block);
    case 'supabase':  return await supabaseBlockUser(credentials.url, credentials.serviceKey, table, userId, block);
    case 'sqlite':    return await sqliteBlockUser(credentials.filePath, table, userId, block);
    default: throw new Error(`Block not supported for ${dbType}`);
  }
};

const deleteUser = async (dbType, credentials, table, userId) => {
  switch (dbType) {
    case 'mongodb':   return await mongoDeleteUser(credentials.uri, table, userId);
    case 'mysql':     return await mysqlDeleteUser(credentials.uri, table, userId);
    case 'postgresql':return await pgDeleteUser(credentials.uri, table, userId);
    case 'firebase':  return await firebaseDeleteUser(credentials.serviceAccount, userId);
    case 'supabase':  return await supabaseDeleteUser(credentials.url, credentials.serviceKey, table, userId);
    case 'sqlite':    return await sqliteDeleteUser(credentials.filePath, table, userId);
    default: throw new Error(`Delete not supported for ${dbType}`);
  }
};

module.exports = { fetchUsers, updateUser, blockUser, deleteUser };
