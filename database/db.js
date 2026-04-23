const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'store.db');
const db = new sqlite3.Database(DB_PATH);

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Promisified helpers
db.get = (function(original) {
  return function(sql, params = []) {
    return new Promise((resolve, reject) => {
      original.call(this, sql, params, (err, row) => {
        if (err) reject(err); else resolve(row);
      });
    });
  };
})(db.get.bind(db));

db.all = (function(original) {
  return function(sql, params = []) {
    return new Promise((resolve, reject) => {
      original.call(this, sql, params, (err, rows) => {
        if (err) reject(err); else resolve(rows || []);
      });
    });
  };
})(db.all.bind(db));

db.run = (function(original) {
  return function(sql, params = []) {
    return new Promise((resolve, reject) => {
      original.call(this, sql, params, function(err) {
        if (err) reject(err); else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  };
})(db.run.bind(db));

db.exec = (function(original) {
  return function(sql) {
    return new Promise((resolve, reject) => {
      original.call(this, sql, (err) => {
        if (err) reject(err); else resolve();
      });
    });
  };
})(db.exec.bind(db));

async function initDB() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      stock INTEGER DEFAULT 0,
      image TEXT,
      category_id INTEGER REFERENCES categories(id),
      brand TEXT,
      is_featured INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      wilaya TEXT NOT NULL,
      address TEXT NOT NULL,
      user_id INTEGER,
      total REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      viewed INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name TEXT NOT NULL,
      product_image TEXT,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL
    );
  `);
}

module.exports = { db, initDB };
