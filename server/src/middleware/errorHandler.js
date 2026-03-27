export default function errorHandler(err, req, res, _next) {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  const status = err.status || 500;

  // Only expose error messages for client errors (4xx)
  // For server errors (5xx), return generic message to prevent info leaks
  const message = status < 500
    ? (err.message || 'Bad request')
    : 'Internal server error';

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
