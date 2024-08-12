const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg'); // Use Pool from pg module
const cors = require('cors');
const dotenv = require('dotenv');

const app = express();


app.use(cors({
    origin: 'http://localhost:3000'
}));

dotenv.config();

// Create a new pool of connections
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, 
  port: parseInt(process.env.DB_PORT), // Ensure port is an integer
  max: 10, // connection pool limit
});

// Connect to the database
pool.connect((err, client, done) => {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
  console.log('Connected to database');
  done();
});


// const pool = new Pool({
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: process.env.DB_PORT,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

// pool.connect()
//   .then(() => console.log('Connected to database'))
//   .catch(err => console.error('Database connection failed:', err.stack));

// // Middleware
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


//add jobs
app.post('/api/jobs', async (req, res) => {
  const { job_title, organization, job_description, category } = req.body;

  try {
    const query = `
      INSERT INTO jobs (job_title, organization, job_description, category)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `;
    const values = [job_title, organization, job_description, category];

    const result = await pool.query(query, values);

    res.status(200).json({
      message: 'Job added successfully',
      jobId: result.rows[0].id
    });
  } catch (error) {
    console.error('Error adding job:', error);
    res.status(500).json({ message: 'Error adding job' });
  }
});


// app.get('/api/jobs', async (req, res) => {
//   const page = parseInt(req.query.page) || 1; // Default to page 1 if not provided
//   const limit = parseInt(req.query.limit) || 5; // Default to 5 jobs per page if not provided
//   const offset = (page - 1) * limit; // Calculate the offset for pagination

//   try {
//     // Get the total count of jobs
//     const totalJobsResult = await pool.query('SELECT COUNT(*) AS count FROM jobs');
//     const totalJobs = parseInt(totalJobsResult.rows[0].count);

//     // Fetch the paginated jobs
//     const result = await pool.query(
//       'SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2',
//       [limit, offset]
//     );

//     // Calculate total pages
//     const totalPages = Math.ceil(totalJobs / limit);

//     res.json({
//       jobs: result.rows,
//       totalJobs,
//       totalPages,
//       currentPage: page
//     });
//   } catch (error) {
//     console.error('Error fetching jobs', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });


app.get('/api/jobs', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jobs ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching jobs', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM jobs WHERE id = $1',
      [id]
    );
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Job not found' });
    }
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/gov', async (req, res) => {
  try {
    console.log('Attempting to fetch government jobs');
    const result = await pool.query(`
      SELECT * FROM jobs
      WHERE category = 'government'
      ORDER BY created_at DESC;
    `);
    console.log('Query executed successfully');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching government jobs:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ message: 'Error fetching government jobs' });
  }
});



app.get('/api/private', async (req, res) => {
  try {
    console.log('Attempting to fetch government jobs');
    const result = await pool.query(`
      SELECT * FROM jobs
      WHERE category = 'private'
      ORDER BY created_at DESC;
    `);
    console.log('Query executed successfully');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching government jobs:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ message: 'Error fetching government jobs' });
  }
});


app.post('/api/links', async (req, res) => {
  try {
    const { title, link } = req.body;
    const newLink = await pool.query(
      'INSERT INTO links (title, link) VALUES ($1, $2) RETURNING *',
      [title, link]
    );
    res.json(newLink.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


app.get('/api/links', async (req, res) => {
  try {
    const allLinks = await pool.query('SELECT * FROM links  ORDER BY id DESC');
    res.json(allLinks.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});



app.post('/api/books', async (req, res) => {
  try {
    const { title, link } = req.body;
    const newBook = await pool.query(
      'INSERT INTO books (title, link) VALUES ($1, $2) RETURNING *',
      [title, link]
    );
    res.json(newBook.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


app.get('/api/books', async (req, res) => {
  try {
    const allbooks = await pool.query('SELECT * FROM books  ORDER BY id DESC');
    res.json(allbooks.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});



//delete

// API endpoint

app.delete('/api/jobs/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid job ID' });
  }

  try {
    // First, check if the job exists
    const checkJob = await pool.query('SELECT * FROM jobs WHERE id = $1', [id]);
    
    if (checkJob.rows.length === 0) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // If job exists, proceed with deletion
    const result = await pool.query('DELETE FROM jobs WHERE id = $1 RETURNING *', [id]);

    res.json({ message: 'Job deleted successfully', deletedJob: result.rows[0] });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Delete link
app.delete('/api/links/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid link ID' });
  }

  try {
    const checkLink = await pool.query('SELECT * FROM links WHERE id = $1', [id]);

    if (checkLink.rows.length === 0) {
      return res.status(404).json({ message: 'Link not found' });
    }

    const result = await pool.query('DELETE FROM links WHERE id = $1 RETURNING *', [id]);
    res.json({ message: 'Link deleted successfully', deletedLink: result.rows[0] });
  } catch (error) {
    console.error('Error deleting link:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Delete book
app.delete('/api/books/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid book ID' });
  }

  try {
    const checkBook = await pool.query('SELECT * FROM books WHERE id = $1', [id]);

    if (checkBook.rows.length === 0) {
      return res.status(404).json({ message: 'Book not found' });
    }

    const result = await pool.query('DELETE FROM books WHERE id = $1 RETURNING *', [id]);
    res.json({ message: 'Book deleted successfully', deletedBook: result.rows[0] });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
