const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

router.get('/', async (req, res) => {
  const featured = await db.all(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_featured = 1 ORDER BY p.created_at DESC LIMIT 8
  `);
  const categories = await db.all('SELECT * FROM categories');
  const newArrivals = await db.all(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.created_at DESC LIMIT 4
  `);
  res.render('index', { featured, categories, newArrivals, title: 'الرئيسية' });
});

router.get('/products', async (req, res) => {
  const { category, search, sort } = req.query;
  let query = 'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1';
  const params = [];
  if (category) { query += ' AND c.slug = ?'; params.push(category); }
  if (search) { query += ' AND (p.name LIKE ? OR p.brand LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (sort === 'price_asc') query += ' ORDER BY p.price ASC';
  else if (sort === 'price_desc') query += ' ORDER BY p.price DESC';
  else query += ' ORDER BY p.created_at DESC';
  const products = await db.all(query, params);
  const categories = await db.all('SELECT * FROM categories');
  res.render('products', { products, categories, category: category || '', search: search || '', sort: sort || '', title: 'المنتجات' });
});

router.get('/products/:id', async (req, res) => {
  const product = await db.get(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?
  `, [req.params.id]);
  if (!product) return res.redirect('/products');
  const related = await db.all(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.category_id = ? AND p.id != ? LIMIT 4
  `, [product.category_id, product.id]);
  res.render('product-detail', { product, related, title: product.name });
});

module.exports = router;
