const http = require('http');

const data = JSON.stringify({
  cliente_nombre: "Test Client",
  tasa_cambio_usd_bs: 36,
  lineas: [
    {
      tipo: "piedra",
      descripcion: "Cuarzo",
      metros_lineales: 10,
      precio_unitario_usd: 200,
      cantidad: 1
    }
  ]
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/presupuestos',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, res => {
  let body = '';
  res.on('data', d => {
    body += d;
  });
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Response Body:', body);
  });
});

req.on('error', error => {
  console.error('Request Error:', error);
});

req.write(data);
req.end();
