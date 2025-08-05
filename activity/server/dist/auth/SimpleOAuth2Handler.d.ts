import { Request, Response, NextFunction } from 'express';
import { Low } from 'lowdb';
interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    email?: string;
    verified?: boolean;
    global_name?: string;
}
interface DiscordGuild {
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
    features: string[];
}
interface UserSession {
    userId: string;
    guildId: string;
    channelId: string;
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    permissions: string[];
    userData: DiscordUser;
    guildData: DiscordGuild;
}
export declare class SimpleOAuth2Handler {
    private db;
    private clientId;
    private clientSecret;
    private redirectUri;
    private jwtSecret;
    constructor(db: Low<any>);
    generateAuthUrl(state?: string): string;
    exchangeCode(code: string): Promise<any>;
    getDiscordUser(accessToken: string): Promise<DiscordUser>;
    getDiscordGuilds(accessToken: string): Promise<DiscordGuild[]>;
    createJWT(payload: any, expiresIn?: string): string;
    verifyJWT(token: string): any;
    requireAuth(): (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    storeUserSession(session: UserSession): Promise<void>;
    getUserSession(userId: string, guildId: string): Promise<UserSession | null>;
}
export {};
