// app.js
const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Databasanslutningskonfiguration
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'api_db'
};

// Skapa en poolad anslutning för bättre prestanda
const pool = mysql.createPool(dbConfig);

// Initiera databasen och tabeller
async function initDatabase() {
  try {
    const connection = await pool.getConnection();
    
    // Skapa databasen om den inte finns
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    await connection.query(`USE ${dbConfig.database}`);
    
    // Skapa produkttabellen
    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        description TEXT,
        inStock BOOLEAN DEFAULT true,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Databas och tabeller initierade');
    connection.release();
  } catch (err) {
    console.error('Fel vid initiering av databas:', err);
    process.exit(1);
  }
}

// Dokumentation på roten
app.get('/', (req, res) => {
  const documentation = `
    <h1>API Dokumentation</h1>
    <h2>Tillgängliga endpoints:</h2>
    <ul>
      <li><strong>GET /products</strong> - Hämtar alla produkter</li>
      <li><strong>GET /products/:id</strong> - Hämtar en specifik produkt med angivet ID</li>
      <li><strong>POST /products</strong> - Skapar en ny produkt. Skicka JSON i följande format:
        <pre>
        {
          "name": "Produktnamn",
          "price": 100,
          "description": "Produktbeskrivning",
          "inStock": true
        }
        </pre>
      </li>
    </ul>
  `;
  res.send(documentation);
});

// hämta alla produkter
app.get('/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// hämta en produkt med specifikt ID
app.get('/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM products WHERE id = ?', [req.params.id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Produkten hittades inte' });
    }
    
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /products - Skapa en ny produkt
app.post('/products', async (req, res) => {
  const { name, price, description, inStock } = req.body;
  
  if (!name || !price) {
    return res.status(400).json({ message: 'Namn och pris måste anges' });
  }
  
  try {
    const [result] = await pool.query(
      'INSERT INTO products (name, price, description, inStock) VALUES (?, ?, ?, ?)',
      [name, price, description, inStock === undefined ? true : inStock]
    );
    
    const [newProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);
    res.status(201).json(newProduct[0]);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Initiera databasen och starta servern
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`Server körs på port ${PORT}`);
  });
});