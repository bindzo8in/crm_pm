ALTER TABLE "user"
ADD COLUMN "additional_departments" "Department"[] NOT NULL DEFAULT ARRAY[]::"Department"[];
