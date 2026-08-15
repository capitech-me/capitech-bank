import { z } from "zod";

/** Shared zod schemas for client + edge function validation. */

const email = z.string().email("Enter a valid email address").max(254);
const password = z
  .string()
  .min(8, "At least 8 characters")
  .max(72)
  .regex(/[a-zA-Z]/, "Must include letters")
  .regex(/\d/, "Must include a number");

export const signUpSchema = z.object({
  email,
  password,
  first_name: z.string().min(1, "First name is required").max(60),
  last_name: z.string().min(1, "Last name is required").max(60),
  account_type: z.enum(["retail", "corporate"]).default("retail"),
  country: z.string().length(2),
  accept_terms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
});

export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email,
  password,
});

export type SignInInput = z.infer<typeof signInSchema>;

export const transferSchema = z.object({
  from_account_id: z.string().uuid(),
  to_account_no: z.string().min(6).max(34),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  narration: z.string().max(140).optional().default(""),
  reference: z.string().max(40).optional(),
});

export type TransferInput = z.infer<typeof transferSchema>;

export const createCardSchema = z.object({
  account_id: z.string().uuid(),
  brand: z.enum(["visa", "mastercard"]).default("visa"),
  name_on_card: z.string().min(2).max(60),
  daily_limit: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
});

export type CreateCardInput = z.infer<typeof createCardSchema>;

export const depositSchema = z.object({
  account_id: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  method: z.enum(["card", "bank_transfer", "crypto"]).default("bank_transfer"),
});

export const withdrawSchema = z.object({
  account_id: z.string().uuid(),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  method: z.enum(["bank_transfer", "crypto"]).default("bank_transfer"),
  to_iban: z.string().optional(),
});

export const openDepositSchema = z.object({
  account_id: z.string().uuid(),
  product_id: z.string().uuid(),
  principal: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  term_days: z.number().int().min(7).max(3650),
  rollover: z.boolean().default(false),
});

export const retailKycSchema = z.object({
  first_name: z.string().min(1).max(60),
  last_name: z.string().min(1).max(60),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nationality: z.string().length(2),
  country_of_residence: z.string().length(2),
  address_line1: z.string().min(3).max(120),
  address_line2: z.string().max(120).optional(),
  city: z.string().min(1).max(80),
  state: z.string().max(80).optional(),
  postal_code: z.string().max(20).optional(),
  occupation: z.string().max(80).optional(),
  source_of_funds: z.string().max(80).optional(),
  is_pep: z.boolean().default(false),
});

export const corporateKycSchema = z.object({
  legal_name: z.string().min(2).max(120),
  trading_name: z.string().max(120).optional(),
  registration_number: z.string().min(2).max(60),
  tax_id: z.string().max(60).optional(),
  country_of_incorporation: z.string().length(2),
  entity_type: z.string().max(60).optional(),
  industry: z.string().max(60).optional(),
  website: z.string().url().optional().or(z.literal("")),
  address_line1: z.string().min(3).max(120),
  city: z.string().min(1).max(80),
  state: z.string().max(80).optional(),
  postal_code: z.string().max(20).optional(),
});

export const mfaVerifySchema = z.object({
  factorId: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

export const openAccountSchema = z.object({
  product_id: z.string().uuid(),
  owner_type: z.enum(["customer", "organization"]).default("customer"),
  owner_id: z.string().uuid(),
  currency: z.string().length(3),
});

export const updateProfileSchema = z.object({
  first_name: z.string().min(1).max(60).optional(),
  last_name: z.string().min(1).max(60).optional(),
  phone: z.string().max(30).optional().nullable(),
  email_notifications: z.boolean().optional(),
});
