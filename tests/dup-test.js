(async () => {
  const API = 'http://localhost:8787/api';
  const login = await fetch(API + '/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'director', password: 'admin' })
  });
  const { token } = await login.json();
  const res = await fetch(API + '/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ name: 'dup', username: 'director', password: 'pass', role: 'PROFESSOR' })
  });
  const text = await res.text();
  console.log('status', res.status, 'body', text);
})();
