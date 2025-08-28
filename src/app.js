const express = require('express');

const app = express();
// require('./utils/cronBackup');

// const userRoutes = require('./api/routes/userRoutes');
// const authRouter = require('./api/routes/authRouter');

// http-errors is a middleware which creates an error object
const createError = require('http-errors');
// morgan is a middleware which logs all the requests to the console
const morgan = require('morgan');
// body-parser is a middleware which parses the incoming request body
const bodyParser = require('body-parser');
// Rate Limiter  is a middleware which limits the number of requests a client can make
const rateLimit = require('express-rate-limit');
// Cors is a middleware which allows cross-origin requests
const cors = require('cors');
const helmet = require('helmet');
// const xss = require('xss');
const compression = require('compression');
// const mongoSanitize = require('express-mongo-sanitize');
// const cron = require('node-cron');

const cookieParser = require('cookie-parser');
const swaggerUI = require('swagger-ui-express');
const { errorResponse } = require('./helpers/responseHandler');
const morganMiddleware = require('./middlewares/loggerMiddleware');

const swaggerSpec = require('./utils/swagger');
const routes = require('./routes');

const { ALLOWED_ORIGINS } = require('./config/env');

const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Middlewares
// Static files
app.use(express.static('public'));

app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(rateLimiter);
app.use(cookieParser());
app.use(morganMiddleware); // Request Logging Middleware
app.use(helmet()); // Secures HTTP headers
// app.use(xss()); // Sanitizes input data
app.use(compression()); // Enable Gzip/Brotli compression for responses
// app.use(mongoSanitize()); // Middleware to sanitize user input

// Swagger UI
app.use(
  '/api-docs',
  swaggerUI.serve,
  swaggerUI.setup(swaggerSpec, { explorer: true })
);

// const corsOptions = {
//   origin: (origin, callback) => {
//     if (!origin || ALLOWED_ORIGINS.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error('Not allowed by CORS'));
//     }
//   },
//   credentials: true,
// };

// app.use(cors(corsOptions));
// app.use(
//   cors({
//     origin: true,
//     credentials: true,
//   })
// );

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://bloghub-sooty.vercel.app',
      ];
      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Home Page',
  });
});

// Use the centralized router
app.use('/api', routes);

// // Task Function
// const runTask = () => {
//     console.log(`⏰ Task Running at: ${new Date().toLocaleString()}`);
// };

// // Run cron job every minute
// cron.schedule('*/5 * * * * *', runTask);

// Client Error Handling Middleware
app.use((req, res, next) => {
  next(createError(404, '404 Not Found'));
});

// Server Error Handling Middleware
app.use((error, req, res, _next) => {
  console.error(error.stack);
  errorResponse(res, {
    statusCode: error.status,
    message: error.message,
  });

  // next();
});

module.exports = app;
