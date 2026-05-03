const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/presupuestos',
  method: 'GET'
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => {
    body += d;
  });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    try {
      const json = JSON.parse(body);
      console.log('Success:', json.success);
      if (!json.success) console.log('Message:', json.message);
      else console.log('Count:', json.data.length);
    } catch(e) {
      console.log('Response Body:', body);
    }
  });
});

req.on('error', error => {
  console.error('Request Error:', error);
});

req.end();
