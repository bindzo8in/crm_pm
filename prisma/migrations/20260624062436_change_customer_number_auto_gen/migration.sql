-- AlterTable
CREATE SEQUENCE customer_customernumber_seq;
ALTER TABLE "Customer" ALTER COLUMN "customerNumber" SET DEFAULT nextval('customer_customernumber_seq');
ALTER SEQUENCE customer_customernumber_seq OWNED BY "Customer"."customerNumber";
