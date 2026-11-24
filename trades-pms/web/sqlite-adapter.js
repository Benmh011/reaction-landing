// Makes sql.js (SQLite compiled to WebAssembly) look like the part of Node's
// built-in `node:sqlite` that src/db.js uses, so db.js runs in a browser
// without a single change:
//
//   new DatabaseSync(file)            db.exec(sql)
//   db.prepare(sql).get(...params)    -> one row object, or undefined
//   db.prepare(sql).all(...params)    -> array of row objects
//   db.prepare(sql).run(...params)    -> { changes, lastInsertRowid }
//
// The database lives in memory. `exportBytes()` returns it as an ordinary
// SQLite file image, which is what gets saved against the signed-in login.

export function makeSqlite(SQL, { initialBytes = null, onWrite = () => {} } = {}) {
  let live = null;

  class Statement {
    constructor(db, sql) {
      this.db = db;
      this.sql = sql;
    }
    #with(params, fn) {
      const stmt = this.db.prepare(this.sql);
      try {
        if (params.length) stmt.bind(params);
        return fn(stmt);
      } finally {
        stmt.free();
      }
    }
    get(...params) {
      return this.#with(params, (s) => (s.step() ? s.getAsObject() : undefined));
    }
    all(...params) {
      return this.#with(params, (s) => {
        const rows = [];
        while (s.step()) rows.push(s.getAsObject());
        return rows;
      });
    }
    run(...params) {
      this.#with(params, (s) => {
        while (s.step()) { /* run to completion */ }
      });
      const changes = this.db.getRowsModified();
      const lastInsertRowid = this.db.exec("SELECT last_insert_rowid()")[0].values[0][0];
      onWrite();
      return { changes, lastInsertRowid };
    }
  }

  class DatabaseSync {
    // The file name is ignored: there is one database per signed-in login,
    // and its bytes (if any) were fetched before the app started.
    constructor() {
      live = initialBytes ? new SQL.Database(initialBytes) : new SQL.Database();
      live.exec("PRAGMA foreign_keys = ON");
    }
    exec(sql) {
      live.exec(sql);
    }
    prepare(sql) {
      return new Statement(live, sql);
    }
    close() {
      if (live) live.close();
      live = null;
    }
  }

  // sql.js closes and reopens the database to export it, which puts every
  // PRAGMA back to its default, so foreign keys are switched on again.
  function exportBytes() {
    if (!live) throw new Error("The database is not open.");
    const bytes = live.export();
    live.exec("PRAGMA foreign_keys = ON");
    return bytes;
  }

  return { DatabaseSync, exportBytes };
}
