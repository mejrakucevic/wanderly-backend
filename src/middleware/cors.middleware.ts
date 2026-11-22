import cors from 'cors';
import { ApiError } from '../utils/api-error.js';

/** Allows listed browser origins. Native apps and Postman send no Origin header. */
export function corsMiddleware(allowedOrigins: string[]) {
  return cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new ApiError(403, 'This browser origin is not allowed.'));
    },
  });
}
