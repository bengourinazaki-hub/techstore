const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { db } = require('../database/db');
const wilayas = require('../helpers/wilayas');

router.get('/checkout', (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect('/cart');
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  res.render('checkout', { cart, total, wilayas, errors: [], old: {}, title: 'إتمام الطلب' });
});

router.post('/checkout', [
  body('first_name').trim().isLength({ min: 2 }).withMessage('الاسم يجب أن يكون حرفين على الأقل'),
  body('last_name').trim().isLength({ min: 2 }).withMessage('اللقب يجب أن يكون حرفين على الأقل'),
  body('phone').trim().matches(/^(05|06|07)[0-9]{8}$/).withMessage('رقم الهاتف غير صحيح، يجب أن يبدأ بـ 05 أو 06 أو 07'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('البريد الإلكتروني غير صحيح'),
  body('wilaya').notEmpty().withMessage('يرجى اختيار الولاية'),
  body('address').trim().isLength({ min: 10 }).withMessage('العنوان يجب أن يكون 10 أحرف على الأقل'),
], async (req, res) => {
  const cart = req.session.cart || [];
  if (cart.length === 0) return res.redirect('/cart');
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('checkout', { cart, total, wilayas, errors: errors.array(), old: req.body, title: 'إتمام الطلب' });
  }

  // Check stock
  for (const item of cart) {
    const p = await db.get('SELECT stock FROM products WHERE id = ?', [item.id]);
    if (!p || p.stock < item.quantity) {
      return res.render('checkout', {
        cart, total, wilayas,
        errors: [{ msg: `المنتج "${item.name}" غير متوفر بالكمية المطلوبة` }],
        old: req.body, title: 'إتمام الطلب'
      });
    }
  }

  const { first_name, last_name, email, phone, wilaya, address, notes } = req.body;
  const order = await db.run(
    'INSERT INTO orders (first_name, last_name, email, phone, wilaya, address, user_id, total, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [first_name, last_name, email || '', phone, wilaya, address, req.session.user?.id || null, total, notes || '']
  );

  for (const item of cart) {
    await db.run(
      'INSERT INTO order_items (order_id, product_id, product_name, product_image, quantity, unit_price) VALUES (?, ?, ?, ?, ?, ?)',
      [order.lastID, item.id, item.name, item.image || '', item.quantity, item.price]
    );
    await db.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.id]);
  }

  req.session.cart = [];
  res.redirect(`/order-success/${order.lastID}`);
});

router.get('/order-success/:id', async (req, res) => {
  const order = await db.get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.redirect('/');
  const items = await db.all('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
  res.render('order-success', { order, items, title: 'تم تأكيد طلبك' });
});

module.exports = router;
