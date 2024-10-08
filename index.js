const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg'); // Use Pool from pg module
const cors = require('cors');
const dotenv = require('dotenv');

const app = express();
app.use(cors());

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


app.get('/api/jobs', async (req, res) => {
  const { page = 1, limit = 8 } = req.query;

  try {
    const offset = (page - 1) * limit;
    const result = await pool.query('SELECT * FROM jobs ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

    // Also get the total count of jobs for pagination purposes
    const totalJobsResult = await pool.query('SELECT COUNT(*) FROM jobs');
    const totalJobs = parseInt(totalJobsResult.rows[0].count, 10);

    res.json({ jobs: result.rows, totalJobs });
  } catch (error) {
    console.error('Error fetching jobs', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/api/jobs/delete', async (req, res) => {
  const { page = 1, limit = 5 } = req.query;

  try {
    const offset = (page - 1) * limit;
    const result = await pool.query('SELECT * FROM jobs ORDER BY created_at ASC LIMIT $1 OFFSET $2', [limit, offset]);

    // Also get the total count of jobs for pagination purposes
    const totalJobsResult = await pool.query('SELECT COUNT(*) FROM jobs');
    const totalJobs = parseInt(totalJobsResult.rows[0].count, 10);

    res.json({ jobs: result.rows, totalJobs });
  } catch (error) {
    console.error('Error fetching jobs', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// app.get('/api/jobs', async (req, res) => {
//   try {
//     const result = await pool.query('SELECT * FROM jobs ORDER BY created_at DESC');
//     res.json(result.rows);
//   } catch (error) {
//     console.error('Error fetching jobs', error);
//     res.status(500).json({ error: 'Internal Server Error' });
//   }
// });


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


// app.js or your API routes file
app.get('/api/gov', async (req, res) => {
  const { page = 1, limit = 8 } = req.query;

  const offset = (page - 1) * limit;

  try {
    console.log('Attempting to fetch government jobs');
    const result = await pool.query(`
      SELECT * FROM jobs
      WHERE category = 'government'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `, [limit, offset]);

    const totalJobsResult = await pool.query(`SELECT COUNT(*) FROM jobs WHERE category = 'government'`);
    const totalJobs = parseInt(totalJobsResult.rows[0].count, 10);

    res.json({ jobs: result.rows, totalJobs });
    console.log('Query executed successfully');
  } catch (error) {
    console.error('Error fetching government jobs:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ message: 'Error fetching government jobs' });
  }
});


app.get('/api/private', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 8;
  const offset = (page - 1) * limit;

  try {
    console.log('Attempting to fetch private jobs');
    const result = await pool.query(
      'SELECT * FROM jobs WHERE category = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      ['private', limit, offset]
    );


    const totalJobsResult = await pool.query(`SELECT COUNT(*) FROM jobs WHERE category = 'private'`);
    const totalJobs = parseInt(totalJobsResult.rows[0].count, 10);

    res.json({ jobs: result.rows, totalJobs });
  } catch (error) {
    console.error('Error fetching private jobs:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ message: 'Error fetching private jobs' });
  }
});




app.get('/api/internships', async (req, res) => {
  const { page = 1, limit = 8 } = req.query;

  const offset = (page - 1) * limit;

  try {
    console.log('Attempting to fetch internship jobs');
    const result = await pool.query(`
      SELECT * FROM jobs
      WHERE category = 'internship'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2;
    `, [limit, offset]);

    const totalJobsResult = await pool.query(`SELECT COUNT(*) FROM jobs WHERE category = 'internship'`);
    const totalJobs = parseInt(totalJobsResult.rows[0].count, 10);

    res.json({ jobs: result.rows, totalJobs });
    console.log('Query executed successfully');
  } catch (error) {
    console.error('Error fetching internship jobs:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ message: 'Error fetching internship jobs' });
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
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      'SELECT * FROM links ORDER BY id DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    const totalResult = await pool.query(`SELECT COUNT(*) FROM links`);
    const total = parseInt(totalResult.rows[0].count, 10);

    res.json({ links: result.rows, total });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


app.get('/api/links/delete', async (req, res) => {
  const { page = 1, limit = 5 } = req.query;

  try {
    const offset = (page - 1) * limit;
    const result = await pool.query('SELECT * FROM links ORDER BY id ASC LIMIT $1 OFFSET $2', [limit, offset]);

    const totalLinksResult = await pool.query('SELECT COUNT(*) FROM links');
    const totalLinks = parseInt(totalLinksResult.rows[0].count, 10);

    res.json({ links: result.rows, totalLinks });
  } catch (error) {
    console.error('Error fetching links', error);
    res.status(500).json({ error: 'Internal Server Error' });
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
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const offset = (page - 1) * limit;

  try {
    const result = await pool.query(
      'SELECT * FROM books ORDER BY id DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    const totalResult = await pool.query(`SELECT COUNT(*) FROM books`);
    const total = parseInt(totalResult.rows[0].count, 10);

    res.json({ books: result.rows, total });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});



app.get('/api/books/delete', async (req, res) => {
  const { page = 1, limit = 5 } = req.query;

  try {
    const offset = (page - 1) * limit;
    const result = await pool.query('SELECT * FROM books ORDER BY id ASC LIMIT $1 OFFSET $2', [limit, offset]);

    const totalBooksResult = await pool.query('SELECT COUNT(*) FROM books');
    const totalBooks = parseInt(totalBooksResult.rows[0].count, 10);

    res.json({ books: result.rows, totalBooks });
  } catch (error) {
    console.error('Error fetching books', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



//course

app.post('/api/courses', async (req, res) => {
  try {
    const { title, link } = req.body;
    const newCourse = await pool.query(
      'INSERT INTO course (title, link) VALUES ($1, $2) RETURNING *',
      [title, link]
    );
    res.json(newCourse.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


app.get('/api/courses', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 6;
  const offset = (page - 1) * limit;

  try {
    // Query to get paginated courses
    const result = await pool.query(
      'SELECT * FROM course ORDER BY id DESC LIMIT $1 OFFSET $2',
      [limit, offset]
    );

    // Query to get the total count of courses
    const totalResult = await pool.query('SELECT COUNT(*) FROM course');
    const total = parseInt(totalResult.rows[0].count, 10);

    // Send response
    res.json({ courses: result.rows, total });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});


app.get('/api/courses/delete', async (req, res) => {
  const { page = 1, limit = 5 } = req.query;

  try {
    const offset = (page - 1) * limit;
    const result = await pool.query('SELECT * FROM course ORDER BY id ASC LIMIT $1 OFFSET $2', [limit, offset]);

    const totalCoursesResult = await pool.query('SELECT COUNT(*) FROM course');
    const totalCourses = parseInt(totalCoursesResult.rows[0].count, 10);

    res.json({ courses: result.rows, totalCourses });
  } catch (error) {
    console.error('Error fetching courses', error);
    res.status(500).json({ error: 'Internal Server Error' });
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



app.delete('/api/courses/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    return res.status(400).json({ message: 'Invalid course ID' });
  }

  try {
    const checkCourse = await pool.query('SELECT * FROM course WHERE id = $1', [id]);

    if (checkCourse.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const result = await pool.query('DELETE FROM course WHERE id = $1 RETURNING *', [id]);
    res.json({ message: 'Course deleted successfully', deletedCourse: result.rows[0] });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


