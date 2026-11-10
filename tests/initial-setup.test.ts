import assert from "node:assert/strict";
import test from "node:test";
import {
  createBootstrapSignupSignature,
  isValidBootstrapSignupSignature,
} from "../lib/bootstrap-signup";
import { initialSetupSchema } from "../lib/schemas/initial-setup";

const validSetup = {
  displayName: "Bindzo8",
  legalName: "Bindzo8 Private Limited",
  email: "office@example.com",
  phone: "+91 9876543210",
  address: "12 Example Road",
  city: "Bengaluru",
  state: "Karnataka",
  country: "India",
  postalCode: "560001",
  expectedClockIn: "09:00",
  expectedClockOut: "18:00",
  attendanceReminderTime: "08:30",
  gracePeriodMinutes: "15",
  officeLatitude: "12.9716",
  officeLongitude: "77.5946",
  officeRadiusMeters: "500",
};

test("bootstrap signature is email-normalized and rejects invalid signatures", () => {
  const signature = createBootstrapSignupSignature(
    "Admin@Example.com",
    "test-secret",
  );

  assert.equal(
    isValidBootstrapSignupSignature(signature, "admin@example.com", "test-secret"),
    true,
  );
  assert.equal(
    isValidBootstrapSignupSignature(signature, "other@example.com", "test-secret"),
    false,
  );
  assert.equal(
    isValidBootstrapSignupSignature("not-a-signature", "admin@example.com", "test-secret"),
    false,
  );
  assert.equal(
    isValidBootstrapSignupSignature(null, "admin@example.com", "test-secret"),
    false,
  );
});

test("initial setup validates and transforms location and shift values", () => {
  const result = initialSetupSchema.safeParse(validSetup);

  assert.equal(result.success, true);
  if (!result.success) return;

  assert.equal(result.data.officeLatitude, 12.9716);
  assert.equal(result.data.officeLongitude, 77.5946);
  assert.equal(result.data.gracePeriodMinutes, 15);
});

test("initial setup rejects invalid office coordinates and reminder times", () => {
  const invalidLocation = initialSetupSchema.safeParse({
    ...validSetup,
    officeLatitude: "91",
  });
  const invalidReminder = initialSetupSchema.safeParse({
    ...validSetup,
    attendanceReminderTime: "09:00",
  });

  assert.equal(invalidLocation.success, false);
  assert.equal(invalidReminder.success, false);
});
