import { z } from 'zod';
import { normalizeIndianMobilePhone } from '../utils/phone.util';

const customerTypes = ['home', 'shop', 'hotel', 'bank', 'event'] as const;

const phoneSchema = z
  .union([z.string(), z.number()])
  .transform((phone) => normalizeIndianMobilePhone(String(phone)) ?? '')
  .pipe(z.string().regex(/^\d{10}$/, 'Phone number must be 10 digits'));

const optionalEmailSchema = z
  .union([z.string().trim().email('Email must be valid'), z.literal('')])
  .optional();

export const registerSchema = z
  .object({
    email: optionalEmailSchema,
    phone: phoneSchema,
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().trim().min(1, 'Name cannot be empty').optional(),
    customerType: z.enum(customerTypes).optional(),
    address: z.string().optional(),
  })
  // Preserve backward compatibility for extra client fields such as role.
  .passthrough();

const pkceVerifier = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9\-._~]{43,128}$/, 'Code verifier is invalid');

export const googleAuthSchema = z
  .object({
    idToken: z.string().trim().min(20).max(8192).optional(),
    code: z.string().trim().min(1).max(2048).optional(),
    codeVerifier: pkceVerifier.optional(),
    redirectUri: z.string().trim().min(1).max(500).optional(),
  })
  .strict()
  .superRefine((data, context) => {
    const hasToken = Boolean(data.idToken);
    const hasCodeParts = Boolean(data.code || data.codeVerifier || data.redirectUri);
    if (hasToken && hasCodeParts) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Send either a Google ID token or an authorization code',
      });
    }
    if (!hasToken && !(data.code && data.codeVerifier && data.redirectUri)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A Google ID token or an authorization code, verifier, and redirect URI are required',
      });
    }
  });

export const loginSchema = z
  .object({
    phone: z.string().trim().min(1, 'Phone number cannot be empty').optional(),
    email: optionalEmailSchema,
    password: z.string().min(1, 'Password is required'),
  })
  .passthrough()
  .superRefine((data, context) => {
    if (!data.phone && !data.email) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: 'Phone number or email is required',
      });
    }
  });
