import { z } from "zod";
import { WorkMode, AttendanceStatus } from "@/app/generated/prisma/enums";

export const clockInSchema = z.object({
  workMode: z.enum(WorkMode),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  locationName: z.string().nullable().optional(),
  selfieUrl: z.string().nullable().optional(),
  selfiePublicId: z.string().nullable().optional(),
  notes: z.string().max(500, "Notes must be under 500 characters").nullable().optional(),
});

export type ClockInInput = z.infer<typeof clockInSchema>;

export const clockOutSchema = z.object({
  notes: z.string().max(500, "Notes must be under 500 characters").nullable().optional(),
});

export type ClockOutInput = z.infer<typeof clockOutSchema>;

export const startBreakSchema = z.object({
  type: z.string().default("LUNCH"),
});

export type StartBreakInput = z.infer<typeof startBreakSchema>;

export const endBreakSchema = z.object({
  breakId: z.string().optional(),
});

export type EndBreakInput = z.infer<typeof endBreakSchema>;

export const attendanceFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.nativeEnum(AttendanceStatus).optional(),
  userId: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(20),
});

export type AttendanceFilterInput = z.infer<typeof attendanceFilterSchema>;
