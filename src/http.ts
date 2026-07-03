import type { NextFunction, Request, RequestHandler, Response } from 'express';

// Express 4 doesn't catch rejected promises: an async handler that throws
// either crashes the process or leaves the request hanging. Wrap handlers so
// rejections flow to the global error handler in app.ts. Lives outside app.ts
// to avoid an app <-> router import cycle.
export const asyncRoute =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
