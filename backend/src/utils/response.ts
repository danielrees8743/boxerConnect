// API Response Utilities
// Provides consistent response formatting across all endpoints

import { Response } from 'express';
import type { ApiResponse, PaginatedResponse } from '../types';

/**
 * Send a success response
 */
export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return res.status(statusCode).json(response);
}

/**
 * Send a created response (201)
 */
export function sendCreated<T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): Response {
  return sendSuccess(res, data, message, 201);
}

/**
 * Send a no content response (204)
 */
export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

/**
 * Send an error response
 */
export function sendError(
  res: Response,
  error: string,
  statusCode: number = 500,
  errors?: Array<{ field: string; message: string }>
): Response {
  const response: ApiResponse = {
    success: false,
    error,
    errors,
  };
  return res.status(statusCode).json(response);
}

/**
 * Send a paginated response
 */
export function sendPaginated<T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    limit: number;
    total: number;
  },
  message?: string
): Response {
  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    message,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages,
      hasNextPage: pagination.page < totalPages,
      hasPrevPage: pagination.page > 1,
    },
  };
  return res.status(200).json(response);
}

/**
 * Calculate pagination offset
 */
export function calculatePaginationOffset(
  page: number,
  limit: number
): { skip: number; take: number } {
  const validPage = Math.max(1, page);
  const validLimit = Math.min(Math.max(1, limit), 100); // Max 100 items per page
  return {
    skip: (validPage - 1) * validLimit,
    take: validLimit,
  };
}

/**
 * Parse pagination from query params
 */
export function parsePagination(query: {
  page?: string | number;
  limit?: string | number;
}): { page: number; limit: number } {
  const page = typeof query.page === 'string' ? parseInt(query.page, 10) : query.page ?? 1;
  const limit = typeof query.limit === 'string' ? parseInt(query.limit, 10) : query.limit ?? 20;

  return {
    page: isNaN(page) || page < 1 ? 1 : page,
    limit: isNaN(limit) || limit < 1 ? 20 : Math.min(limit, 100),
  };
}
