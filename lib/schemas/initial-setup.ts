import { z } from "zod";

const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}$/, "Enter a time in HH:mm format.")
  .refine((value) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours < 24 && minutes < 60;
  }, "Enter a valid time.");

const coordinate = (min: number, max: number, label: string) =>
  z.coerce
    .number()
    .finite()
    .min(min, `Enter a valid office ${label}.`)
    .max(max, `Enter a valid office ${label}.`);

const integerInput = (min: number, max: number, label: string) =>
  z.coerce
    .number()
    .int(`Enter a whole number for ${label}.`)
    .min(min, `Minimum ${label} is ${min}.`)
    .max(max, `Maximum ${label} is ${max}.`);

export const initialSetupSchema = z
  .object({
    displayName: z.string().trim().min(1, "Enter your company name.").max(160),
    legalName: z.string().trim().min(1, "Enter your legal company name.").max(160),
    email: z.email("Enter a valid company contact email."),
    phone: z.string().trim().min(7, "Enter a valid company phone number.").max(30),
    address: z.string().trim().min(1, "Enter the company address.").max(240),
    city: z.string().trim().min(1, "Enter the city.").max(100),
    state: z.string().trim().min(1, "Enter the state or region.").max(100),
    country: z.string().trim().min(1, "Enter the country.").max(100),
    postalCode: z.string().trim().max(20),
    expectedClockIn: timeSchema,
    expectedClockOut: timeSchema,
    attendanceReminderTime: timeSchema,
    gracePeriodMinutes: integerInput(0, 120, "the arrival grace period"),
    officeLatitude: coordinate(-90, 90, "latitude"),
    officeLongitude: coordinate(-180, 180, "longitude"),
    officeRadiusMeters: integerInput(10, 100000, "a geofence radius"),
  })
  .refine(
    ({ expectedClockIn, expectedClockOut }) =>
      expectedClockIn !== expectedClockOut,
    {
      path: ["expectedClockOut"],
      message: "Shift end must be different from shift start.",
    },
  )
  .refine(
    ({ attendanceReminderTime, expectedClockIn }) =>
      timeToMinutes(attendanceReminderTime) < timeToMinutes(expectedClockIn),
    {
      path: ["attendanceReminderTime"],
      message: "Reminder time must be earlier than the expected shift start.",
    },
  );

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

export type InitialSetupFormInput = z.input<typeof initialSetupSchema>;
export type InitialSetupInput = z.output<typeof initialSetupSchema>;
