const express = require('express');
const router = express.Router();
const { db } = require('../database/db');

function getCart(req) { return req.session.cart || []; }
function saveCart(req, cart) { req.session.cart = cart; }

router.get('/cart', (req, res) => {
  const cart = getCart(req);
  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  res.render('cart', { cart, total, title: 'سلة التسوق' });
});

router.post('/cart/add', async (req, res) => {
  const { product_id, quantity = 1 } = req.body;
  const product = await db.get('SELECT * FROM products WHERE id = ?', [product_id]);
  if (!product || product.stock < 1) {
    return res.json({ success: false, message: 'المنتج غير متوفر' });
  }
  const cart = getCart(req);
  const qty = parseInt(quantity) || 1;
  const existing = cart.find(i => i.id == product_id);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + qty, product.stock);
  } else {
    cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, stock: product.stock, quantity: qty });
  }
  saveCart(req, cart);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  res.json({ success: true, message: '✓ تمت الإضافة إلى السلة', cartCount });
});

router.post('/cart/update', (req, res) => {
  const { product_id, quantity } = req.body;
  const cart = getCart(req);
  const item = cart.find(i => i.id == product_id);
  if (item) {
    const qty = parseInt(quantity);
    if (qty <= 0) cart.splice(cart.indexOf(item), 1);
    else item.quantity = Math.min(qty, item.stock);
  }
  saveCart(req, cart);
  res.redirect('/cart');
});

router.post('/cart/remove', (req, res) => {
  saveCart(req, getCart(req).filter(i => i.id != req.body.product_id));
  res.redirect('/cart');
});

module.exports = router;
