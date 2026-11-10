"use client";

import { useState } from "react";
import {
  IssueReportStatus,
  IssueReportType,
} from "@/app/generated/prisma/enums";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import {
  createIssueReportAction,
  getIssueReportsAction,
  updateIssueReportAction,
} from "@/actions/issue-reports";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatInIST } from "@/lib/date";
import {
  createIssueReportSchema,
  updateIssueReportSchema,
  type CreateIssueReportInput,
  type UpdateIssueReportInput,
} from "@/lib/schemas/issue-report";
import { MessageSquareText, Send } from "lucide-react";

type IssueReportRecord = Awaited<ReturnType<typeof getIssueReportsAction>>["reports"][number];

const statusLabels: Record<IssueReportStatus, string> = {
  NEW: "New",
  IN_REVIEW: "In review",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

function formatStatus(status: IssueReportStatus) {
  return statusLabels[status];
}

export function IssueReportDesk({
  initialReports,
  canReview,
  currentUserId,
}: {
  initialReports: IssueReportRecord[];
  canReview: boolean;
  currentUserId: string;
}) {
  const [reports, setReports] = useState(initialReports);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const form = useForm<CreateIssueReportInput>({
    resolver: zodResolver(createIssueReportSchema),
    defaultValues: {
      type: IssueReportType.ISSUE,
      title: "",
      description: "",
    },
  });

  async function submitReport(data: CreateIssueReportInput) {
    setError(null);
    setNotice(null);

    try {
      const result = await createIssueReportAction(data);
      setReports((current) => [result.report, ...current]);
      form.reset();
      setNotice("Your report has been sent to Admin and HR.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not send your report.");
    }
  }

  async function saveReview(data: UpdateIssueReportInput) {
    setError(null);
    setNotice(null);
    try {
      const result = await updateIssueReportAction(data);
      setReports((current) =>
        current.map((report) => (report.id === data.id ? result.report : report)),
      );
      setNotice("Review update saved.");
      return result.report;
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Could not save this update.");
      throw reviewError;
    }
  }

  const activeCount = reports.filter(
    (report) => report.status === IssueReportStatus.NEW || report.status === IssueReportStatus.IN_REVIEW,
  ).length;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <div className="mb-4 flex size-11 items-center justify-center rounded-lg border border-border bg-muted/40">
          <MessageSquareText className="size-5" aria-hidden="true" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Issues & suggestions</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Share something that needs attention or an idea that could make work better.
          Admin and HR can review your report here.
        </p>
      </header>

      {(error || notice) && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            error ? "border-destructive/50 text-destructive" : "border-border bg-muted/30"
          }`}
          role={error ? "alert" : "status"}
        >
          {error ?? notice}
        </div>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Tell us what happened</CardTitle>
            <CardDescription>
              Reports are visible to Admin and HR, and to you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-5"
              noValidate
              onSubmit={form.handleSubmit(submitReport)}
            >
              <Controller
                name="type"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="gap-2">
                    <FieldLabel htmlFor="report-type">I want to share</FieldLabel>
                    <select
                      {...field}
                      id="report-type"
                      aria-invalid={fieldState.invalid}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value={IssueReportType.ISSUE}>An issue</option>
                      <option value={IssueReportType.SUGGESTION}>A suggestion</option>
                    </select>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="gap-2">
                    <FieldLabel htmlFor="report-title">Title</FieldLabel>
                    <Input
                      {...field}
                      id="report-title"
                      aria-invalid={fieldState.invalid}
                      maxLength={160}
                      placeholder="A short summary"
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Controller
                name="description"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="gap-2">
                    <FieldLabel htmlFor="report-description">Details</FieldLabel>
                    <Textarea
                      {...field}
                      id="report-description"
                      aria-invalid={fieldState.invalid}
                      maxLength={5000}
                      rows={6}
                      placeholder="What happened, where did you notice it, or how would your idea help?"
                    />
                    <FieldDescription>
                      Please avoid including passwords or other sensitive information.
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
                <Send aria-hidden="true" />
                {form.formState.isSubmitting ? "Sending…" : "Send report"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <section aria-labelledby="reports-heading" className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="reports-heading" className="text-xl font-semibold">
                {canReview ? "Team reports" : "Your reports"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {canReview
                  ? `${reports.length} recent ${reports.length === 1 ? "report" : "reports"}${
                      activeCount ? `. ${activeCount} need attention.` : "."
                    }`
                  : "Follow the status and response to your reports here."}
              </p>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
              <MessageSquareText className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 font-medium">Nothing here yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {canReview ? "New staff reports will appear here." : "When you send a report, you can track it here."}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {reports.map((report) => (
                <li key={report.id}>
                  <Card size="sm">
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded border border-border px-2 py-0.5">
                              {report.type === IssueReportType.ISSUE ? "Issue" : "Suggestion"}
                            </span>
                            <span className="rounded border border-border px-2 py-0.5 font-medium">
                              {formatStatus(report.status)}
                            </span>
                          </div>
                          <h3 className="font-medium">{report.title}</h3>
                        </div>
                        <time
                          className="shrink-0 text-xs text-muted-foreground"
                          dateTime={report.createdAt.toISOString()}
                        >
                          {formatInIST(report.createdAt, "dd/MM/yyyy")}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {report.description}
                      </p>
                      {canReview && (
                        <p className="text-xs text-muted-foreground">
                          From {report.createdBy.name}
                          {report.createdBy.department
                            ? `, ${report.createdBy.department.replaceAll("_", " ")} department`
                            : ""}
                          {report.createdById === currentUserId ? " (you)" : ""}
                        </p>
                      )}
                      {report.response && (
                        <div className="border-l-2 border-foreground/30 pl-3">
                          <p className="text-xs font-medium">
                            {report.reviewedBy?.name ? `Response from ${report.reviewedBy.name}` : "Response"}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                            {report.response}
                          </p>
                        </div>
                      )}
                      {canReview && (
                        <IssueReportReviewForm
                          key={`${report.id}-${report.updatedAt.toISOString()}`}
                          report={report}
                          onSubmit={saveReview}
                        />
                      )}
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function IssueReportReviewForm({
  report,
  onSubmit,
}: {
  report: IssueReportRecord;
  onSubmit: (data: UpdateIssueReportInput) => Promise<IssueReportRecord>;
}) {
  const form = useForm<UpdateIssueReportInput>({
    resolver: zodResolver(updateIssueReportSchema),
    defaultValues: {
      id: report.id,
      status: report.status,
      response: report.response ?? "",
    },
  });

  async function submitReview(data: UpdateIssueReportInput) {
    try {
      const updatedReport = await onSubmit(data);
      form.reset({
        id: updatedReport.id,
        status: updatedReport.status,
        response: updatedReport.response ?? "",
      });
    } catch {
      return;
    }
  }

  return (
    <details className="border-t border-border pt-3">
      <summary className="cursor-pointer text-sm font-medium underline-offset-4 hover:underline">
        Update report
      </summary>
      <form
        className="mt-4 space-y-4"
        noValidate
        onSubmit={form.handleSubmit(submitReview)}
      >
        <input type="hidden" {...form.register("id")} />
        <Controller
          name="status"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-2">
              <FieldLabel htmlFor={`status-${report.id}`}>Status</FieldLabel>
              <select
                {...field}
                id={`status-${report.id}`}
                aria-invalid={fieldState.invalid}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {Object.values(IssueReportStatus).map((status) => (
                  <option key={status} value={status}>{formatStatus(status)}</option>
                ))}
              </select>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="response"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="gap-2">
              <FieldLabel htmlFor={`response-${report.id}`}>
                Response for the person who submitted it
              </FieldLabel>
              <Textarea
                {...field}
                id={`response-${report.id}`}
                aria-invalid={fieldState.invalid}
                maxLength={2000}
                rows={3}
                placeholder="Add an update or explain what happens next."
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Button type="submit" variant="outline" size="sm" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving…" : "Save update"}
        </Button>
      </form>
    </details>
  );
}
