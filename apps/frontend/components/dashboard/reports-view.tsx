"use client";

import { useEffect, useState } from "react";
import { Download, FileBarChart, FileSpreadsheet, Loader2, Plus, Trash2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { deleteReport, generateReport, getReports } from "@/services/reports";
import type { GenerateReportInput } from "@/services/reports";
import { formatDate, formatFileSize, formatRelativeTime } from "@/lib/utils";
import { FIXTURE_NOW } from "@/lib/mock/core";
import { accountGroups, accountsInScope, getAccount, socialAccounts } from "@/lib/mock/accounts";
import { useDashboardFilters } from "@/components/dashboard/filters";
import { ScopeBanner } from "@/components/dashboard/scope-banner";
import { ALL_ACCOUNTS } from "@/lib/types";
import type { AccountId, Report, SocialAccount } from "@/lib/types";

const FORMAT_ICON: Record<Report["format"], LucideIcon> = {
  pdf: FileBarChart,
  csv: FileSpreadsheet,
  xlsx: FileSpreadsheet,
};

const SECTIONS = [
  "Executive summary",
  "Platform breakdown",
  "Account breakdown",
  "Top content",
  "Audience shift",
  "Recommendations",
];

export function ReportsView({ initial }: { initial: Report[] }) {
  const { scope } = useDashboardFilters();
  const [reports, setReports] = useState(initial);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ready = reports.filter((report) => report.status === "ready");
  const scopedAccounts = socialAccounts.filter(
    (account) =>
      account.connected &&
      (scope.accountId === ALL_ACCOUNTS || account.id === scope.accountId) &&
      (scope.platform === "all" || account.platform === scope.platform),
  );

  // The page ships with a default-scope payload; refetch whenever the
  // global scope narrows or widens so the table always matches the banner.
  useEffect(() => {
    let active = true;
    getReports(scope).then((rows) => {
      if (active) setReports(rows);
    });
    return () => {
      active = false;
    };
  }, [scope]);

  async function onCreate(input: GenerateReportInput) {
    const created = await generateReport(input);
    setReports((current) => [created, ...current]);
    setDialogOpen(false);
  }

  async function onDelete(id: string) {
    setPendingId(id);
    setError(null);
    try {
      await deleteReport(id);
      setReports((current) => current.filter((report) => report.id !== id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Delete failed");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generated performance documents, ready to share with clients."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Generate report
          </Button>
        }
      />

      <ScopeBanner
        scope={scope}
        accountCount={scopedAccounts.length}
        totalFollowers={accountsInScope(scope).reduce(
          (sum, account) => sum + account.followers,
          0,
        )}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Reports" value={String(reports.length)} />
        <Tile label="Ready to download" value={String(ready.length)} />
        <Tile
          label="Generating"
          value={String(reports.filter((report) => report.status === "generating").length)}
        />
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <Card className="overflow-hidden">
        {reports.length === 0 ? (
          <EmptyState
            icon={<FileBarChart className="h-4 w-4" />}
            title="No reports yet"
            description="Generate your first report to get a shareable summary."
            action={
              <Button size="sm" onClick={() => setDialogOpen(true)}>
                Generate report
              </Button>
            }
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Report</TH>
                <TH>Scope</TH>
                <TH>Period</TH>
                <TH>Format</TH>
                <TH className="text-right">Size</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {reports.map((report) => {
                const Icon = FORMAT_ICON[report.format];
                return (
                  <TR key={report.id}>
                    <TD>
                      <div className="flex items-start gap-2">
                        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="truncate text-xs font-medium">{report.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {report.sections.length} sections ·{" "}
                            {formatRelativeTime(report.createdAt, FIXTURE_NOW)}
                          </p>
                        </div>
                      </div>
                    </TD>
                    <TD>
                      <span className="text-[11px] text-muted-foreground">
                        {report.accountId
                          ? (getAccount(report.accountId)?.handle ?? "—")
                          : "Workspace-wide"}
                      </span>
                    </TD>
                    <TD className="text-xs text-muted-foreground">
                      {formatDate(report.periodStart)} — {formatDate(report.periodEnd)}
                    </TD>
                    <TD>
                      <Badge variant="outline" size="sm">
                        {report.format.toUpperCase()}
                      </Badge>
                    </TD>
                    <TD className="text-right text-xs tabular-nums text-muted-foreground">
                      {report.sizeBytes === 0 ? "—" : formatFileSize(report.sizeBytes)}
                    </TD>
                    <TD>
                      {report.status === "generating" ? (
                        <Badge variant="default" size="sm" className="gap-1">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          generating
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          ready
                        </Badge>
                      )}
                    </TD>
                    <TD className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={report.status !== "ready"}
                          className="gap-1.5"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={pendingId === report.id}
                          onClick={() => onDelete(report.id)}
                          aria-label={`Delete ${report.name}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

      <GenerateReportDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={onCreate}
        accounts={scopedAccounts}
        defaultAccountId={scope.accountId}
      />
    </div>
  );
}

function GenerateReportDialog({
  open,
  onClose,
  onCreate,
  accounts,
  defaultAccountId,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (input: GenerateReportInput) => Promise<void>;
  accounts: SocialAccount[];
  defaultAccountId: AccountId | typeof ALL_ACCOUNTS;
}) {
  const [form, setForm] = useState<GenerateReportInput>({
    accountId: defaultAccountId,
    name: "September 2026 — Monthly performance",
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    format: "pdf",
    sections: ["Executive summary", "Platform breakdown", "Account breakdown", "Top content"],
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSection(section: string) {
    setForm((current) => ({
      ...current,
      sections: current.sections.includes(section)
        ? current.sections.filter((item) => item !== section)
        : [...current.sections, section],
    }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (form.name.trim().length < 3) {
      setError("Give the report a name.");
      return;
    }
    if (form.periodStart > form.periodEnd) {
      setError("The start date must come before the end date.");
      return;
    }
    if (form.sections.length === 0) {
      setError("Select at least one section.");
      return;
    }

    setPending(true);
    try {
      await onCreate(form);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not generate report");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Generate report"
      description="The engine compiles the selected sections into a downloadable file."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            size="sm"
            type="submit"
            form="report-form"
            disabled={pending}
            className="gap-1.5"
          >
            {pending ? "Generating…" : "Generate"}
          </Button>
        </>
      }
    >
      <form id="report-form" onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Scope">
          <Select
            value={form.accountId}
            onChange={(event) =>
              setForm((current) => ({ ...current, accountId: event.target.value }))
            }
          >
            <option value={ALL_ACCOUNTS}>Entire workspace</option>
            {accountGroups.map((group) => {
              const members = accounts.filter((account) => account.groupId === group.id);
              if (members.length === 0) return null;
              return (
                <optgroup key={group.id} label={group.name}>
                  {members.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.handle}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </Select>
        </Field>

        <Field label="Report name">
          <Input
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From">
            <Input
              type="date"
              value={form.periodStart}
              onChange={(event) =>
                setForm((current) => ({ ...current, periodStart: event.target.value }))
              }
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={form.periodEnd}
              onChange={(event) =>
                setForm((current) => ({ ...current, periodEnd: event.target.value }))
              }
            />
          </Field>
          <Field label="Format">
            <Select
              value={form.format}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  format: event.target.value as Report["format"],
                }))
              }
            >
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
            </Select>
          </Field>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Sections</span>
          <div className="flex flex-wrap gap-2">
            {SECTIONS.map((section) => {
              const active = form.sections.includes(section);
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => toggleSection(section)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {section}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1.5 text-xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
