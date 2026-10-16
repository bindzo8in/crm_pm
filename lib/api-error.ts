import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ActionError } from "@/lib/action-error";

export function actionErrorResponse(error: unknown, context: string) {
  if (error instanceof ActionError) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: error.statusCode },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: error.issues.map(({ message }) => message).join(" "),
      },
      { status: 400 },
    );
  }

  console.error(`${context}:`, error);
  return NextResponse.json(
    { success: false, error: "An unexpected error occurred." },
    { status: 500 },
  );
}
