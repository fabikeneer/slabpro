const nodemailer = require('nodemailer');
const SMTP_USER = 'keneermanganiello@gmail.com';
const SMTP_PASS = 'sqhqxeegskqevtiz';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: SMTP_USER, pass: SMTP_PASS },
  tls: { rejectUnauthorized: false }
});

console.log('User:', SMTP_USER);

transporter.sendMail({
  from: SMTP_USER,
  to: SMTP_USER,
  subject: 'Test Email',
  text: 'This is a test email to check nodemailer.'
}).then(info => {
  console.log('Email sent:', info.response);
}).catch(err => {
  console.error('Error sending email:', err);
});
