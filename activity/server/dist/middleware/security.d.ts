import { Request, Response, NextFunction } from 'express';
export declare const securityConfig: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
export declare const apiRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const aiChatRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const discordActivityHeaders: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateInput: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateDiscordUser: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const errorHandler: (err: any, req: Request, res: Response, next: NextFunction) => void;
declare global {
    namespace Express {
        interface Request {
            discordContext?: {
                userId: string;
                instanceId: string;
            };
        }
    }
}
