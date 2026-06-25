const WEB_APP_URL = "https://oder-backend-2.onrender.com";
fetch(`${WEB_APP_URL}/api/admin/orders-by-ids`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ids: ['96ZHGJ'] })
})
  .then(r => r.json())
  .then(d => console.log(d))
  .catch(console.error);
