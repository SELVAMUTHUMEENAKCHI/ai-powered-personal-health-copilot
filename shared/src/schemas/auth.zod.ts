import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().min(1, 'Please enter your email or ABHA / Patient ID'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RegisterPatientSchema = z.object({
  role: z.enum(['patient', 'admin']).optional().default('patient'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  confirmPassword: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  dob: z.string().optional().default('1995-01-01'),
  gender: z.enum(['male', 'female', 'other']).optional().default('other'),
  bloodGroup: z.string().optional().default('Unknown'),
  phone: z.string().optional(),
  preferredLanguage: z.string().optional().default('en'),
});

export type RegisterPatientInput = z.infer<typeof RegisterPatientSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters long'),
});

export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
