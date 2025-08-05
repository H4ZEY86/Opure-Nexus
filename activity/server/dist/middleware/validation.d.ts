import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
export declare const schemas: {
    userId: z.ZodString;
    aiMessage: z.ZodObject<{
        message: z.ZodEffects<z.ZodEffects<z.ZodString, string, string>, string, string>;
        userId: z.ZodString;
        personality: z.ZodOptional<z.ZodEnum<["scottish_rangers", "core", "music", "adventure", "economy", "social"]>>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        userId: string;
        personality?: "scottish_rangers" | "core" | "music" | "adventure" | "economy" | "social" | undefined;
    }, {
        message: string;
        userId: string;
        personality?: "scottish_rangers" | "core" | "music" | "adventure" | "economy" | "social" | undefined;
    }>;
    discordAuth: z.ZodObject<{
        code: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        code: string;
    }, {
        code: string;
    }>;
    roomJoin: z.ZodObject<{
        roomId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        roomId: string;
    }, {
        roomId: string;
    }>;
    socketAuth: z.ZodObject<{
        userId: z.ZodString;
        username: z.ZodString;
        instanceId: z.ZodOptional<z.ZodString>;
        channelId: z.ZodOptional<z.ZodString>;
        guildId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        username: string;
        instanceId?: string | undefined;
        channelId?: string | undefined;
        guildId?: string | undefined;
    }, {
        userId: string;
        username: string;
        instanceId?: string | undefined;
        channelId?: string | undefined;
        guildId?: string | undefined;
    }>;
};
export declare function validateRequest(schema: z.ZodSchema): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare function sanitizeInput(req: Request, res: Response, next: NextFunction): void;
export declare function rateLimitByUser(maxRequests?: number, windowMs?: number): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
declare global {
    namespace Express {
        interface Request {
            validatedData?: any;
        }
    }
}
