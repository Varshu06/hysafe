import { z } from 'zod';

const customerTypes = ['home', 'shop', 'hotel', 'bank', 'event'] as const;

const phoneSchema = z
  .union([z.string(), z.number()])
  .refine((phone) => {
    let normalizedPhone = String(phone).replace(/\D/g, '');

    if (normalizedPhone.length === 12 && normalizedPhone.startsWith('91')) {
      normalizedPhone = normalizedPhone.slice(2);
    }

    return /^\d{10}$/.test(normalizedPhone);
  }, 'Phone number must be 10 digits');

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
