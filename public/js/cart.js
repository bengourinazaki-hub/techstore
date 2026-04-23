function addToCart(productId, quantity = 1) {
  fetch('/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId, quantity })
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) {
      showToast(data.message);
      // update cart count badge
      const badge = document.querySelector('.cart-count');
      if (badge) badge.textContent = data.cartCount;
    } else {
      showToast(data.message, true);
    }
  })
  .catch(() => showToast('حدث خطأ، حاول مجدداً', true));
}

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  if (!toast || !toastMsg) return;
  toastMsg.textContent = msg;
  toastMsg.className = `px-6 py-3 rounded-full font-semibold shadow-xl text-sm text-white ${isError ? 'bg-red-600' : 'bg-green-600'}`;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}
