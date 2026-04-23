require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const { db, initDB } = require('./database/db');
const seed = require('./database/seed');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'techstore_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

// Global locals
app.use(async (req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.cartCount = (req.session.cart || []).reduce((s, i) => s + i.quantity, 0);
  try {
    const row = await db.get('SELECT COUNT(*) as c FROM orders WHERE viewed = 0');
    res.locals.newOrdersCount = row ? row.c : 0;
  } catch {
    res.locals.newOrdersCount = 0;
  }
  next();
});

app.use('/', require('./routes/store'));
app.use('/', require('./routes/cart'));
app.use('/', require('./routes/checkout'));
app.use('/admin', require('./routes/admin'));

app.use((req, res) => {
  res.status(404).render('404', { title: 'الصفحة غير موجودة' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('حدث خطأ في الخادم');
});

const PORT = process.env.PORT || 3000;

async function start() {
  await initDB();
  await seed();
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`👤 Admin: admin@admin.com / Admin@123`);
    console.log(`🛒 Store: http://localhost:${PORT}`);
    console.log(`⚙️  Admin panel: http://localhost:${PORT}/admin/login`);
  });
}

start().catch(console.error);
