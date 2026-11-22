const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { config } = require('../src/config/db');
const { normalizeClassName } = require('../src/utils/class-name');

async function migrateClasses(db) {
  const [keys] = await db.query(
    "SELECT 1 FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='members' AND COLUMN_NAME='class_id' AND REFERENCED_TABLE_NAME='classes'",
  );
  if (!keys.length) {
    await db.query('ALTER TABLE members ADD CONSTRAINT members_class_fk FOREIGN KEY (class_id) REFERENCES classes(id)');
  }
  await db.beginTransaction();
  try {
    const [members] = await db.query('SELECT id,class_name FROM members WHERE class_id IS NULL ORDER BY id');
    const classes = new Map();
    for (const member of members) {
      const name = normalizeClassName(member.class_name);
      if (!name) continue;
      if (!classes.has(name)) {
        const [result] = await db.execute(
          'INSERT INTO classes(name) VALUES(?) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)',
          [name],
        );
        classes.set(name, result.insertId);
      }
      await db.execute('UPDATE members SET class_id=? WHERE id=? AND class_id IS NULL', [classes.get(name), member.id]);
    }
    await db.commit();
  } catch (error) {
    await db.rollback();
    throw error;
  }
}

async function setup() {
  const db = await mysql.createConnection({ ...config, database: undefined });
  try {
    await db.query('CREATE DATABASE IF NOT EXISTS ??', [config.database]);
    await db.changeUser({
      database: config.database,
      user: config.user,
      password: config.password,
    });
    const schema = fs
      .readFileSync(path.join(__dirname, '../database.sql'), 'utf8')
      .replace(/--[^\n]*/g, '');
    for (const sql of schema
      .split(';')
      .map((s) => s.trim())
      .filter((s) => /^CREATE TABLE/i.test(s)))
      await db.query(sql);
    await db.query("INSERT IGNORE INTO school_calendar(id,holidays) VALUES(1,'{}')");
    const [cascades] = await db.execute(
      "SELECT k.CONSTRAINT_NAME name,k.COLUMN_NAME col,k.REFERENCED_TABLE_NAME target,k.REFERENCED_COLUMN_NAME target_col FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME AND r.TABLE_NAME=k.TABLE_NAME WHERE k.CONSTRAINT_SCHEMA=DATABASE() AND k.TABLE_NAME='borrowings' AND r.DELETE_RULE='CASCADE'",
    );
    for (const fk of cascades) {
      await db.query(
        'ALTER TABLE borrowings DROP FOREIGN KEY ??, ADD FOREIGN KEY (??) REFERENCES ?? (??) ON DELETE RESTRICT',
        [fk.name, fk.col, fk.target, fk.target_col],
      );
    }
    const additions = {
      books: {
        lost: 'INT NOT NULL DEFAULT 0',
        shelf: "VARCHAR(60) DEFAULT ''",
        archived: 'BOOLEAN NOT NULL DEFAULT FALSE',
      },
      members: {
        class_name: "VARCHAR(60) DEFAULT ''",
        class_id: 'INT NULL',
        phone_owner: "VARCHAR(20) DEFAULT 'siswa'",
        consent_at: 'DATETIME NULL',
      },
      borrowings: {
        extension_days: 'SMALLINT UNSIGNED NOT NULL DEFAULT 0',
        extension_base_date: 'DATE NULL',
        quantity: 'INT NOT NULL DEFAULT 1',
        received_date: 'DATE NULL',
        received_by: 'INT NULL',
        paid_date: 'DATE NULL',
        paid_by: 'INT NULL',
      },
    };
    for (const [table, defs] of Object.entries(additions)) {
      const [existing] = await db.query('SHOW COLUMNS FROM ??', [table]);
      for (const [column, type] of Object.entries(defs)) {
        if (!existing.some((x) => x.Field === column))
          await db.query('ALTER TABLE ?? ADD COLUMN ?? ' + type, [
            table,
            column,
          ]);
      }
    }
    await migrateClasses(db);
    await db.query(
      'CREATE TABLE IF NOT EXISTS sessions (token_hash CHAR(64) PRIMARY KEY,user_id INT NOT NULL, expires_at DATETIME NOT NULL, FOREIGN KEY(user_id) REFERENCES users(id))',
    );
    await db.query(`CREATE TABLE IF NOT EXISTS reminders (
      id INT AUTO_INCREMENT PRIMARY KEY, loan_id INT NOT NULL UNIQUE, scheduled DATE NOT NULL,
      target VARCHAR(20), message TEXT, state VARCHAR(20) NOT NULL, reason VARCHAR(255),
      provider_id VARCHAR(100), checked_by INT NULL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY(loan_id) REFERENCES borrowings(id))`);
    await db.query(`CREATE TABLE IF NOT EXISTS reminder_attempts (
      id INT AUTO_INCREMENT PRIMARY KEY, loan_id INT NOT NULL, target VARCHAR(20),
      state VARCHAR(20) NOT NULL, reason VARCHAR(255), provider_id VARCHAR(100),
      attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(loan_id) REFERENCES borrowings(id))`);
  } finally {
    await db.end();
  }
}
if (require.main === module)
  setup()
    .then(() => console.log('Skema MySQL siap.'))
    .catch((e) => {
      console.error(e.code || e.message);
      process.exitCode = 1;
    });
module.exports = setup;
