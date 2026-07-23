import { z } from "zod";

export const companySchema = z.object({
  displayName: z.string().min(1, "Display Name is required"),
  legalName: z.string().min(1, "Legal Name is required"),
  tagline: z.string().optional().nullable(),
  about: z.string().optional().nullable(),

  website: z.string().optional().nullable(),
  email: z.email("Invalid email").min(1, "Email is required"),
  supportEmail: z.union([z.email("Invalid email"), z.literal("")]).optional().nullable(),
  salesEmail: z.union([z.email("Invalid email"), z.literal("")]).optional().nullable(),
  phone: z.string().min(1, "Phone is required"),
  secondaryPhone: z.string().optional().nullable(),

  gstNumber: z.string().optional().nullable(),
  panNumber: z.string().optional().nullable(),
  cinNumber: z.string().optional().nullable(),
  iecCode: z.string().optional().nullable(),
  lutNumber: z.string().optional().nullable(),

  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  country: z.string().min(1, "Country is required"),
  postalCode: z.string().optional().nullable(),
  googleMapUrl: z.string().optional().nullable(),

  logo: z.object({ url: z.string(), publicId: z.string() }).nullable().optional(),
  darkLogo: z.object({ url: z.string(), publicId: z.string() }).nullable().optional(),
  favicon: z.object({ url: z.string(), publicId: z.string() }).nullable().optional(),
  signatureImage: z.object({ url: z.string(), publicId: z.string() }).nullable().optional(),
  sealImage: z.object({ url: z.string(), publicId: z.string() }).nullable().optional(),
});

export type CompanyFormValues = z.infer<typeof companySchema>;
