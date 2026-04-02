const bcrypt = require('bcryptjs');
bcrypt.hash('admin123456', 10).then(async hash => {
  const { Pool } = require('pg');
  const pool = new Pool({ host:'localhost', port:5432, user:'hotboard', password:'hotboard123', database:'hotboard' });
  const r = await pool.query(
    'INSERT INTO admins (email, password_hash, role) VALUES ($1, $2, $3) ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash RETURNING id, email',
    ['admin@hotboard.com', hash, 'super_admin']
  );
  console.log('admin created:', r.rows[0]);
  pool.end();
});
