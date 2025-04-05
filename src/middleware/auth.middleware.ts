import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/env';

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
                user_role?: string;
                app_metadata?: any;
                user_metadata?: any;
            };
        }
    }
}

const authenticateToken = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    try {
        const decoded = jwt.verify(
            token,
            config.supabaseJwtSecret
        ) as any;

        // Add user information to the request object
        req.user = {
            id: decoded.sub,
            email: decoded.email,
            role: decoded.role,
            user_role: decoded.user_role, // Custom claim from Supabase hook
            app_metadata: decoded.app_metadata,
            user_metadata: decoded.user_metadata
        };

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Token expired' });
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
            return;
        }
        res.status(500).json({ error: 'Failed to authenticate token' });
        return;
    }
};

export default authenticateToken; 