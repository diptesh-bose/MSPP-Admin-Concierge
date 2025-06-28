import { Request, Response, NextFunction } from 'express';
export interface AppError extends Error {
    statusCode?: number;
    status?: string;
    isOperational?: boolean;
}
export declare class ValidationError extends Error {
    statusCode: number;
    status: string;
    isOperational: boolean;
    constructor(message: string);
}
export declare class NotFoundError extends Error {
    statusCode: number;
    status: string;
    isOperational: boolean;
    constructor(message?: string);
}
export declare class UnauthorizedError extends Error {
    statusCode: number;
    status: string;
    isOperational: boolean;
    constructor(message?: string);
}
export declare class ForbiddenError extends Error {
    statusCode: number;
    status: string;
    isOperational: boolean;
    constructor(message?: string);
}
export declare const errorHandler: (err: any, req: Request, res: Response, next: NextFunction) => void;
export declare const asyncHandler: (fn: Function) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=errorHandler.d.ts.map