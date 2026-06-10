import { z } from 'zod';

export const requestIdSchema = z.string().min(1);

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
    details: z.record(z.unknown()).optional()
  }),
  requestId: requestIdSchema
});

export const apiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    requestId: requestIdSchema
  });

export type ApiError = z.infer<typeof apiErrorSchema>;
export type ApiSuccess<T> = {
  data: T;
  requestId: string;
};
