const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { db } = require('../database/db');
const isAdmin = require('../middleware/isAdmin');
const upload = require('../middleware/upload');

// ─── Auth ────────────────────────────────────────────────
router.get('/login', (req, res) => {
  if (req.session.user?.role === 'admin') return res.redirect('/admin/dashboard');
  res.render('admin/login', { error: null, title: 'تسجيل دخول الإدارة' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await db.get('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin']);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('admin/login', { error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة', title: 'تسجيل دخول الإدارة' });
  }
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.redirect('/admin/dashboard');
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// ─── Dashboard ───────────────────────────────────────────
router.get('/dashboard', isAdmin, async (req, res) => {
  const totalOrders = (await db.get('SELECT COUNT(*) as c FROM orders')).c;
  const todayOrders = (await db.get("SELECT COUNT(*) as c FROM orders WHERE date(created_at) = date('now')")).c;
  const pendingOrders = (await db.get("SELECT COUNT(*) as c FROM orders WHERE status = 'pending'")).c;
  const revenueRow = await db.get("SELECT COALESCE(SUM(total),0) as t FROM orders WHERE status = 'delivered'");
  const revenue = revenueRow.t;
  const totalProducts = (await db.get('SELECT COUNT(*) as c FROM products')).c;
  const newOrdersCount = (await db.get('SELECT COUNT(*) as c FROM orders WHERE viewed = 0')).c;
  const recentOrders = await db.all('SELECT * FROM orders ORDER BY created_at DESC LIMIT 10');
  const lowStock = await db.all('SELECT * FROM products WHERE stock <= 5 ORDER BY stock ASC');
  res.render('admin/dashboard', { totalOrders, todayOrders, pendingOrders, revenue, totalProducts, newOrdersCount, recentOrders, lowStock, title: 'لوحة التحكم' });
});

// ─── Products ────────────────────────────────────────────
router.get('/products', isAdmin, async (req, res) => {
  const products = await db.all('SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id ORDER BY p.created_at DESC');
  const success = req.session.flash_success || null;
  req.session.flash_success = null;
  res.render('admin/products', { products, success, title: 'إدارة المنتجات' });
});

router.get('/products/new', isAdmin, async (req, res) => {
  const categories = await db.all('SELECT * FROM categories');
  const newOrdersCount = (await db.get('SELECT COUNT(*) as c FROM orders WHERE viewed = 0')).c;
  res.render('admin/product-form', { product: null, categories, error: null, newOrdersCount, title: 'إضافة منتج' });
});

router.post('/products', isAdmin, upload.single('image'), async (req, res) => {
  const { name, description, price, stock, category_id, brand, is_featured } = req.body;
  const image = req.file ? req.file.filename : null;
  await db.run(
    'INSERT INTO products (name, description, price, stock, image, category_id, brand, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name, description || '', parseFloat(price), parseInt(stock), image, category_id || null, brand || '', is_featured ? 1 : 0]
  );
  req.session.flash_success = 'تم إضافة المنتج بنجاح';
  res.redirect('/admin/products');
});

router.get('/products/:id/edit', isAdmin, async (req, res) => {
  const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.redirect('/admin/products');
  const categories = await db.all('SELECT * FROM categories');
  const newOrdersCount = (await db.get('SELECT COUNT(*) as c FROM orders WHERE viewed = 0')).c;
  res.render('admin/product-form', { product, categories, error: null, newOrdersCount, title: 'تعديل المنتج' });
});

router.post('/products/:id', isAdmin, upload.single('image'), async (req, res) => {
  const { name, description, price, stock, category_id, brand, is_featured } = req.body;
  const existing = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!existing) return res.redirect('/admin/products');
  const image = req.file ? req.file.filename : existing.image;
  await db.run(
    'UPDATE products SET name=?, description=?, price=?, stock=?, image=?, category_id=?, brand=?, is_featured=? WHERE id=?',
    [name, description || '', parseFloat(price), parseInt(stock), image, category_id || null, brand || '', is_featured ? 1 : 0, req.params.id]
  );
  req.session.flash_success = 'تم تحديث المنتج بنجاح';
  res.redirect('/admin/products');
});

router.post('/products/:id/delete', isAdmin, async (req, res) => {
  await db.run('DELETE FROM products WHERE id = ?', [req.params.id]);
  req.session.flash_success = 'تم حذف المنتج';
  res.redirect('/admin/products');
});

// ─── Orders ──────────────────────────────────────────────
router.get('/orders', isAdmin, async (req, res) => {
  const { status, wilaya } = req.query;
  let query = 'SELECT * FROM orders WHERE 1=1';
  const params = [];
  if (status) { query += ' AND status = ?'; params.push(status); }
  if (wilaya) { query += ' AND wilaya LIKE ?'; params.push(`%${wilaya}%`); }
  query += ' ORDER BY created_at DESC';
  const orders = await db.all(query, params);
  await db.run('UPDATE orders SET viewed = 1');
  res.render('admin/orders', { orders, status: status || '', wilaya: wilaya || '', title: 'إدارة الطلبات' });
});

router.get('/orders/:id', isAdmin, async (req, res) => {
  const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.redirect('/admin/orders');
  const items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  await db.run('UPDATE orders SET viewed = 1 WHERE id = ?', [order.id]);
  res.render('admin/order-detail', { order, items, title: `طلب #${order.id}` });
});

router.post('/orders/:id/status', isAdmin, async (req, res) => {
  await db.run('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
  res.redirect(`/admin/orders/${req.params.id}`);
});

// ─── Categories ──────────────────────────────────────────
router.get('/categories', isAdmin, async (req, res) => {
  const categories = await db.all('SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON p.category_id = c.id GROUP BY c.id');
  const success = req.session.flash_success || null;
  req.session.flash_success = null;
  res.render('admin/categories', { categories, success, error: null, title: 'إدارة الفئات' });
});

router.post('/categories', isAdmin, async (req, res) => {
  const { name, slug } = req.body;
  try {
    await db.run('INSERT INTO categories (name, slug) VALUES (?, ?)', [name.trim(), slug.trim().toLowerCase()]);
    req.session.flash_success = 'تم إضافة الفئة بنجاح';
    res.redirect('/admin/categories');
  } catch (e) {
    const categories = await db.all('SELECT c.*, COUNT(p.id) as product_count FROM categories c LEFT JOIN products p ON p.category_id = c.id GROUP BY c.id');
    res.render('admin/categories', { categories, success: null, error: 'الاسم المختصر مستخدم بالفعل', title: 'إدارة الفئات' });
  }
});

router.post('/categories/:id/delete', isAdmin, async (req, res) => {
  await db.run('UPDATE products SET category_id = NULL WHERE category_id = ?', [req.params.id]);
  await db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
  req.session.flash_success = 'تم حذف الفئة';
  res.redirect('/admin/categories');
});

module.exports = router;
