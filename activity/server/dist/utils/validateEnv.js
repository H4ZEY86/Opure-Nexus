"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironment = validateEnvironment;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.string().transform(Number).default('3001'),
    HOST: zod_1.z.string().default('0.0.0.0'),
    DISCORD_CLIENT_ID: zod_1.z.string().min(1, 'DISCORD_CLIENT_ID is required'),
    DISCORD_CLIENT_SECRET: zod_1.z.string().min(1, 'DISCORD_CLIENT_SECRET is required'),
    DISCORD_REDIRECT_URI: zod_1.z.string().url('DISCORD_REDIRECT_URI must be a valid URL'),
    JWT_SECRET: zod_1.z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    CLIENT_URL: zod_1.z.string().url('CLIENT_URL must be a valid URL').default('http://localhost:3000'),
});
function validateEnvironment() {
    try {
        return envSchema.parse(process.env);
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            console.error('Environment validation failed:');
            error.errors.forEach(err => {
                console.error(`  ${err.path.join('.')}: ${err.message}`);
            });
            process.exit(1);
        }
        throw error;
    }
}
//# sourceMappingURL=validateEnv.js.map