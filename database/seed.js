const { db } = require('./db');
const bcrypt = require('bcryptjs');

async function seed() {
  const row = await db.get('SELECT COUNT(*) as c FROM users');
  if (row.c > 0) return;

  const adminHash = bcrypt.hashSync('Admin@123', 12);
  await db.run("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')",
    ['المدير', 'admin@admin.com', adminHash]);

  const cats = [
    ['هواتف ذكية', 'phones'],
    ['لابتوب وكمبيوتر', 'laptops'],
    ['أجهزة لوحية', 'tablets'],
    ['إكسسوارات', 'accessories'],
  ];
  for (const [name, slug] of cats) {
    await db.run('INSERT INTO categories (name, slug) VALUES (?, ?)', [name, slug]);
  }

  const phones = await db.get("SELECT id FROM categories WHERE slug='phones'");
  const laptops = await db.get("SELECT id FROM categories WHERE slug='laptops'");
  const tablets = await db.get("SELECT id FROM categories WHERE slug='tablets'");
  const acc = await db.get("SELECT id FROM categories WHERE slug='accessories'");

  const products = [
    ['سامسونج Galaxy S24 Ultra', 'هاتف ذكي متطور بشاشة 6.8 بوصة Dynamic AMOLED، معالج Snapdragon 8 Gen 3، كاميرا 200 ميغابكسل.', 189000, 15, phones.id, 'Samsung', 1],
    ['آيفون 15 Pro Max', 'أحدث هواتف آبل بشاشة Super Retina XDR 6.7 بوصة، شريحة A17 Pro، نظام كاميرا ثلاثي متطور.', 215000, 8, phones.id, 'Apple', 1],
    ['شاومي Redmi Note 13 Pro', 'هاتف بشاشة AMOLED 6.67 بوصة، كاميرا 200 ميغابكسل، شحن سريع 67 واط.', 65000, 30, phones.id, 'Xiaomi', 0],
    ['لابتوب Dell XPS 15', 'لابتوب احترافي بشاشة OLED 15.6 بوصة 4K، معالج Intel Core i7، ذاكرة 16GB، SSD 512GB.', 245000, 5, laptops.id, 'Dell', 1],
    ['ماك بوك برو M3', 'لابتوب آبل بشريحة M3، شاشة Liquid Retina XDR 14 بوصة، بطارية تدوم 22 ساعة.', 320000, 4, laptops.id, 'Apple', 1],
    ['آيباد Pro M2', 'جهاز لوحي احترافي بشاشة Liquid Retina XDR 11 بوصة، شريحة M2.', 145000, 10, tablets.id, 'Apple', 0],
    ['سماعات Sony WH-1000XM5', 'سماعات لاسلكية بتقنية إلغاء الضوضاء، جودة صوت استثنائية، بطارية 30 ساعة.', 38000, 20, acc.id, 'Sony', 0],
    ['شاحن لاسلكي Anker 15W', 'شاحن لاسلكي سريع 15 واط، متوافق مع جميع أجهزة Qi.', 4500, 50, acc.id, 'Anker', 0],
  ];

  for (const [name, desc, price, stock, cat_id, brand, featured] of products) {
    await db.run(
      'INSERT INTO products (name, description, price, stock, category_id, brand, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, desc, price, stock, cat_id, brand, featured]
    );
  }

  console.log('✅ Seed data inserted');
}

module.exports = seed;
