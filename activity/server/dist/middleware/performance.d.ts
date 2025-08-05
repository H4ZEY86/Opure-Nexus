import { Request, Response, NextFunction } from 'express';
export declare const compressionMiddleware: import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>>;
export declare const cacheControl: (maxAge?: number) => (req: Request, res: Response, next: NextFunction) => void;
export declare const responseTime: (req: Request, res: Response, next: NextFunction) => void;
export declare const memoryMonitoring: (req: Request, res: Response, next: NextFunction) => void;
export declare const getDatabaseConnection: () => any;
export declare const assetOptimization: (req: Request, res: Response, next: NextFunction) => void;
export declare const healthCheck: (req: Request, res: Response) => void;
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
