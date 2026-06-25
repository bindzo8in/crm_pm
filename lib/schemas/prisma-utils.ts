import { Prisma } from "@/app/generated/prisma/client";

export function getErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return "A record with this value already exists";

      case "P2025":
        return "Record not found";

      default:
        return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
}