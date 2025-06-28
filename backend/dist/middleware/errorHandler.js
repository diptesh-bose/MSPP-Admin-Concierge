"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.ValidationError = void 0;
const logger_1 = require("../utils/logger");
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 400;
        this.status = 'fail';
        this.isOperational = true;
        this.name = 'ValidationError';
    }
}
exports.ValidationError = ValidationError;
class NotFoundError extends Error {
    constructor(message = 'Resource not found') {
        super(message);
        this.statusCode = 404;
        this.status = 'fail';
        this.isOperational = true;
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.statusCode = 401;
        this.status = 'fail';
        this.isOperational = true;
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends Error {
    constructor(message = 'Forbidden') {
        super(message);
        this.statusCode = 403;
        this.status = 'fail';
        this.isOperational = true;
        this.name = 'ForbiddenError';
    }
}
exports.ForbiddenError = ForbiddenError;
const handleDatabaseError = (err) => {
    let message = 'Database operation failed';
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        message = 'Resource already exists';
    }
    else if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        message = 'Referenced resource does not exist';
    }
    else if (err.code === 'SQLITE_CONSTRAINT') {
        message = 'Data constraint violation';
    }
    const error = new Error(message);
    error.statusCode = 400;
    error.status = 'fail';
    error.isOperational = true;
    return error;
};
const handleValidationError = (err) => {
    const errors = err.array?.() || [];
    const message = errors.length > 0
        ? `Validation failed: ${errors.map((e) => e.msg).join(', ')}`
        : 'Validation failed';
    const error = new ValidationError(message);
    return error;
};
const sendErrorDev = (err, res) => {
    res.status(err.statusCode || 500).json({
        status: err.status || 'error',
        error: err,
        message: err.message,
        stack: err.stack,
    });
};
const sendErrorProd = (err, res) => {
    if (err.isOperational) {
        res.status(err.statusCode || 500).json({
            status: err.status || 'error',
            message: err.message,
        });
    }
    else {
        logger_1.logger.error('Unexpected error:', err);
        res.status(500).json({
            status: 'error',
            message: 'Something went wrong!',
        });
    }
};
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    if (!error.statusCode)
        error.statusCode = 500;
    if (!error.status)
        error.status = error.statusCode >= 400 && error.statusCode < 500 ? 'fail' : 'error';
    if (err.code && err.code.startsWith('SQLITE_')) {
        error = handleDatabaseError(err);
    }
    else if (err.array && typeof err.array === 'function') {
        error = handleValidationError(err);
    }
    else if (err.name === 'JsonWebTokenError') {
        error = new UnauthorizedError('Invalid token');
    }
    else if (err.name === 'TokenExpiredError') {
        error = new UnauthorizedError('Token expired');
    }
    else if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
        error = new ValidationError('Invalid JSON format');
    }
    if (error.statusCode && error.statusCode >= 500) {
        logger_1.logger.error('Server Error:', {
            error: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('User-Agent'),
        });
    }
    else {
        logger_1.logger.warn('Client Error:', {
            error: error.message,
            url: req.url,
            method: req.method,
            statusCode: error.statusCode,
        });
    }
    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(error, res);
    }
    else {
        sendErrorProd(error, res);
    }
};
exports.errorHandler = errorHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map