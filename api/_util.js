import { logError } from './_log.js';

// Wraps a handler so any thrown/rejected error (bad DATABASE_URL, a dropped
// connection, a bug) becomes a clean generic JSON error instead of Vercel's
// default crash page or a leaked stack trace. The real error is still logged
// server-side (structured, via _log.js) for debugging.
export function withErrorHandling(name, handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      logError(`${name}_handler_error`, err, { method: req.method });
      if (!res.headersSent) {
        res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
      }
    }
  };
}
