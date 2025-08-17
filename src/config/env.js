require('dotenv').config();

const PORT = process.env.PORT || 8000;
const MONGO_URI =
  process.env.MONGO_URI ||
  'mongodb+srv://mahbubcseme:cWwytaDk58VukOfR@cluster0.o6a5qyq.mongodb.net/ecommerce';

// Allow origins for cors
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [];

// SMTP nodemailer
const SMTP_USER_NAME = process.env.SMTP_USER_NAME || '';
const SMTP_PASSWORD = process.env.SMTP_PASSWORD || '';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// JWT keys
const JWT_REG_KEY = process.env.JWT_REG_KEY || 'GHJDKJDSHKJAHDKYHU*I$45454';
const JWT_ACCESS_KEY =
  process.env.JWT_ACCESS_KEY || 'GHJDKJDSHKJAHDKYHU*I$45454';
const JWT_REFRESH_KEY =
  process.env.JWT_REFRESH_KEY || 'GHJDKJDSHKJAHDKYHU*I$45454';

// Cloudinary
const { CLOUDINARY_CLOUD_NAME } = process.env;
const { CLOUDINARY_API_KEY } = process.env;
const { CLOUDINARY_API_SECRET } = process.env;

module.exports = {
  PORT,
  MONGO_URI,
  JWT_REG_KEY,
  SMTP_USER_NAME,
  SMTP_PASSWORD,
  CLIENT_URL,
  JWT_ACCESS_KEY,
  JWT_REFRESH_KEY,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  ALLOWED_ORIGINS,
};
