// backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Harami12',
  database: process.env.DB_NAME || 'jobbox',
  port: process.env.DB_PORT || 5432
});

pool.connect()
  .then(() => console.log('Connected to database'))
  .catch(err => console.error('Database connection failed:', err.stack));

// Middleware
app.use(bodyParser.json());



//api for login

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    // Query the database for the user
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length > 0) {
      const user = result.rows[0];

      if (password === user.password) {
        res.json({ message: 'Login successful', user: { username: user.username, name: user.name, email: user.email } });
      } else {
        res.status(401).json({ message: 'Invalid username or password' });
      }
    } else {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
