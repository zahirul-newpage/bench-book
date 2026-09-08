-- Demo accounts (passwords: bench-book-demo / bench-book-admin) and starting
-- reagent inventory. Hashes generated with the same PBKDF2 scheme as
-- src/lib/auth/password.ts (see the note there on the stored salt:hash format).
INSERT INTO users (id, email, password_hash, role) VALUES
  ('user-1', 'scientist@benchbook.app', 'zLlfNIaqxwQoLi/8KV/4ww==:gvv8Xix0H+Jh2WUm3qdZyfxIdm7eO7Wxq4Xp/BXyJwI=', 'scientist'),
  ('user-2', 'admin@benchbook.app', '3y6s7FE4cLG465TFXZPvUA==:GvC4DukTeonGpqfuT0taU/bEJXqWmsVuHoD6rLER9mA=', 'admin');

INSERT INTO reagents (id, name, unit, stock) VALUES
  ('reagent-1', 'Tris buffer, pH 7.4', 'mL', 950),
  ('reagent-2', 'NaCl', 'g', 480),
  ('reagent-3', 'Ethanol, 70%', 'mL', 1200),
  ('reagent-4', 'PBS', 'mL', 60);

INSERT INTO notebook_entries (id, bench_id, raw_transcript, author_id, created_at) VALUES
  ('seed-1', 'Bench 3', 'Added 5 mL of Tris buffer, pH 7.4, incubated at 37°C for 20 minutes, then centrifuged at 3000 RPM for 5 minutes.', 'user-1', datetime('now', '-1 hour'));

INSERT INTO entry_steps (id, entry_id, order_index, text) VALUES
  ('seed-1-step-1', 'seed-1', 1, 'Add Tris buffer, pH 7.4'),
  ('seed-1-step-2', 'seed-1', 2, 'Incubate at 37°C for 20 minutes'),
  ('seed-1-step-3', 'seed-1', 3, 'Centrifuge at 3000 RPM for 5 minutes');

INSERT INTO entry_reagents (id, entry_id, name, amount) VALUES
  ('seed-1-reagent-1', 'seed-1', 'Tris buffer, pH 7.4', '5 mL');
