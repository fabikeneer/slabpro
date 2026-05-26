require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls: { rejectUnauthorized: false }
});

console.log('User:', process.env.SMTP_USER);

transporter.sendMail({
  from: process.env.SMTP_USER,
  to: process.env.SMTP_USER,
  subject: 'Test Email',
  text: 'This is a test email to check nodemailer.'
}).then(info => {
  console.log('Email sent:', info.response);
}).catch(err => {
  console.error('Error sending email:', err);
});
