import { Request, Response, NextFunction } from 'express';
interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar?: string;
}
interface AuthenticatedRequest extends Request {
    user?: DiscordUser;
    discordContext?: {
        userId: string;
        instanceId: string;
        guildId?: string;
        channelId?: string;
    };
}
export declare function verifyJWT(req: AuthenticatedRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function verifyDiscordToken(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function requireUserOwnership(req: AuthenticatedRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function requireGuildMembership(req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function generateJWT(user: DiscordUser, discordContext?: any): string;
export declare function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
export { AuthenticatedRequest };
