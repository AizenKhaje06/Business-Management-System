'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Upload,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Download,
  Eye,
  Database,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { useToast } from '@/hooks/use-toast';
import {
  type ImportEntityType,
  type ParsedFileData,
  type ValidationResult,
  type ImportSummary,
  getEntityLabels,
  getEntityColumns,
} from '@/lib/import-config';

type WizardStep = 'upload' | 'mapping' | 'preview' | 'summary';

const stepLabels: Array<{ step: WizardStep; label: string; icon: typeof Upload }> = [
  { step: 'upload', label: 'Upload', icon: Upload },
  { step: 'mapping', label: 'Column Mapping', icon: Database },
  { step: 'preview', label: 'Preview & Validate', icon: Eye },
  { step: 'summary', label: 'Summary', icon: CheckCircle2 },
];

export function ImportWizard() {
  const { toast } = useToast();
  const [step, setStep] = useState<WizardStep>('upload');
  const [entityType, setEntityType] = useState<ImportEntityType>('clients');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('csv');
  const [parsedData, setParsedData] = useState<ParsedFileData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const entityLabels = useMemo(() => getEntityLabels(), []);
  const entityColumns = useMemo(
    () => getEntityColumns(entityType),
    [entityType]
  );

  const currentStepIndex = stepLabels.findIndex((s) => s.step === step);

  const handleFileSelect = useCallback(
    async (file: File) => {
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      const isXlsx =
        file.name.toLowerCase().endsWith('.xlsx') ||
        file.name.toLowerCase().endsWith('.xls');

      if (!isCsv && !isXlsx) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a CSV or XLSX file.',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 10MB.',
          variant: 'destructive',
        });
        return;
      }

      setFileName(file.name);
      setFileType(isCsv ? 'csv' : 'xlsx');
      setIsProcessing(true);

      try {
        const buffer = await file.arrayBuffer();
        const { parseFile } = await import('@/app/actions/imports');
        const parsed = await parseFile(buffer, isCsv ? 'csv' : 'xlsx');

        if (parsed.totalRows === 0) {
          toast({
            title: 'Empty file',
            description: 'The uploaded file contains no data rows.',
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }

        setParsedData(parsed);

        // Auto-map columns by matching headers to field names
        const autoMapping: Record<string, string> = {};
        for (const col of entityColumns) {
          const match = parsed.headers.find(
            (h) =>
              h.toLowerCase().replace(/[\s_-]/g, '') ===
                col.field.toLowerCase().replace(/[\s_-]/g, '') ||
              h.toLowerCase().includes(col.field.toLowerCase()) ||
              h.toLowerCase().includes(col.label.toLowerCase())
          );
          autoMapping[col.field] = match || 'skip';
        }
        setColumnMapping(autoMapping);

        toast({
          title: 'File parsed successfully',
          description: `${parsed.totalRows} rows found with ${parsed.headers.length} columns.`,
        });
        setStep('mapping');
      } catch {
        toast({
          title: 'Failed to parse file',
          description: 'Please check the file format and try again.',
          variant: 'destructive',
        });
      }
      setIsProcessing(false);
    },
    [entityColumns, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleValidate = async () => {
    if (!parsedData) return;
    setIsValidating(true);

    try {
      const { validateImportData } = await import('@/app/actions/imports');
      const result = await validateImportData(
        entityType,
        parsedData.rows,
        columnMapping
      );
      setValidation(result);
      setStep('preview');
    } catch {
      toast({
        title: 'Validation failed',
        description: 'An error occurred during validation.',
        variant: 'destructive',
      });
    }
    setIsValidating(false);
  };

  const handleImport = async () => {
    if (!validation || !parsedData) return;
    setIsProcessing(true);

    try {
      const { executeImport } = await import('@/app/actions/imports');
      const summary = await executeImport(
        entityType,
        validation.valid,
        fileName,
        fileType,
        validation,
        columnMapping
      );
      setImportSummary(summary);
      setStep('summary');

      if (summary.imported > 0) {
        toast({
          title: 'Import completed',
          description: `${summary.imported} rows imported successfully.`,
        });
      } else {
        toast({
          title: 'Import failed',
          description: 'No rows were imported. Check the summary for details.',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Import failed',
        description: 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
    setIsProcessing(false);
  };

  const handleReset = () => {
    setStep('upload');
    setEntityType('clients');
    setFileName('');
    setParsedData(null);
    setColumnMapping({});
    setValidation(null);
    setImportSummary(null);
    setShowErrorDetails(false);
  };

  const handleEntityTypeChange = (value: string) => {
    setEntityType(value as ImportEntityType);
    setParsedData(null);
    setColumnMapping({});
    setValidation(null);
    setImportSummary(null);
    setStep('upload');
  };

  function downloadErrorReport() {
    if (!validation) return;
    const lines = ['Row Number,Errors,Source Data'];
    for (const inv of validation.invalid) {
      const dataStr = JSON.stringify(inv.row).replace(/"/g, '""');
      lines.push(`"${inv.rowIndex}","${inv.errors.join('; ').replace(/"/g, '""')}","${dataStr}"`);
    }
    for (const dup of validation.duplicates) {
      const dataStr = JSON.stringify(dup.row).replace(/"/g, '""');
      lines.push(`"${dup.rowIndex}","Duplicate of: ${dup.duplicateOf.replace(/"/g, '""')}","${dataStr}"`);
    }
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'import-error-report.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Entity selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import Target</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Label className="text-sm text-muted-foreground whitespace-nowrap">
              Import into:
            </Label>
            <Select
              value={entityType}
              onValueChange={handleEntityTypeChange}
              disabled={step !== 'upload'}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {entityLabels.map((e) => (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 overflow-x-auto py-2">
        {stepLabels.map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.step;
          const isComplete = currentStepIndex > i;
          return (
            <div key={s.step} className="flex items-center">
              <div
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isComplete
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < stepLabels.length - 1 && (
                <ArrowRight className="mx-1 h-4 w-4 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      {step === 'upload' && (
        <Card>
          <CardContent className="pt-6">
            <div
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25'
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <div className="mb-4 rounded-full bg-muted p-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="mb-2 text-lg font-medium">
                Drag and drop your file here
              </p>
              <p className="mb-4 text-sm text-muted-foreground">
                Supports CSV and XLSX files up to 10MB
              </p>
              <Label
                htmlFor="file-input"
                className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Browse Files
              </Label>
              <Input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />
            </div>

            {isProcessing && (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Parsing file...
              </div>
            )}

            <div className="mt-6 rounded-lg bg-muted/50 p-4">
              <p className="mb-2 text-sm font-medium">Expected columns for {entityType}:</p>
              <div className="flex flex-wrap gap-2">
                {entityColumns.map((col) => (
                  <Badge
                    key={col.field}
                    variant={col.required ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {col.label}
                    {col.required && ' *'}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'mapping' && parsedData && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Map Columns: {fileName} ({parsedData.totalRows} rows)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Match the columns from your file to the fields in the database.
              Fields marked with * are required.
            </p>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Database Field</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>File Column</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entityColumns.map((col) => (
                    <TableRow key={col.field}>
                      <TableCell className="font-medium">
                        {col.label}
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({col.type})
                        </span>
                      </TableCell>
                      <TableCell>
                        {col.required ? (
                          <Badge variant="default" className="text-xs">
                            Required
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Optional
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={columnMapping[col.field] || 'skip'}
                          onValueChange={(v) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              [col.field]: v,
                            }))
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">-- Skip --</SelectItem>
                            {parsedData.headers.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Data preview */}
            <div>
              <p className="mb-2 text-sm font-medium">Data Preview (first 5 rows):</p>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {parsedData.headers.map((h) => (
                        <TableHead key={h} className="whitespace-nowrap">
                          {h}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.rows.slice(0, 5).map((row, i) => (
                      <TableRow key={i}>
                        {parsedData.headers.map((h) => (
                          <TableCell key={h} className="whitespace-nowrap text-sm">
                            {String(row[h] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep('upload')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={handleValidate}
                disabled={isValidating}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    Validate Data
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'preview' && validation && (
        <div className="space-y-4">
          {/* Validation summary cards */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Rows
                </CardTitle>
                <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums">
                  {validation.totalRows}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Valid Rows
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-emerald-600">
                  {validation.validCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Invalid Rows
                </CardTitle>
                <XCircle className="h-4 w-4 text-rose-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-rose-600">
                  {validation.invalidCount}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Duplicate Rows
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold tabular-nums text-amber-600">
                  {validation.duplicateCount}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Error details */}
          {(validation.invalid.length > 0 || validation.duplicates.length > 0) && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Error Report</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowErrorDetails((v) => !v)}
                  >
                    {showErrorDetails ? 'Hide' : 'Show'} Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadErrorReport}
                  >
                    <Download className="mr-1.5 h-4 w-4" />
                    Download
                  </Button>
                </div>
              </CardHeader>
              {showErrorDetails && (
                <CardContent>
                  <div className="max-h-[400px] overflow-y-auto space-y-2">
                    {validation.invalid.map((inv, i) => (
                      <div
                        key={`inv-${i}`}
                        className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm"
                      >
                        <div className="flex items-start gap-2">
                          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                          <div className="flex-1">
                            <p className="font-medium text-rose-900">
                              Row {inv.rowIndex}
                            </p>
                            <ul className="mt-1 list-inside list-disc text-rose-700">
                              {inv.errors.map((err, j) => (
                                <li key={j}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                    {validation.duplicates.map((dup, i) => (
                      <div
                        key={`dup-${i}`}
                        className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                          <div className="flex-1">
                            <p className="font-medium text-amber-900">
                              Row {dup.rowIndex}
                            </p>
                            <p className="text-amber-700">
                              Duplicate of existing record: {dup.duplicateOf}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Valid data preview */}
          {validation.valid.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Valid Data Preview ({validation.valid.length} rows ready to import)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-[300px] overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {Object.keys(validation.valid[0]).map((h) => (
                          <TableHead key={h} className="whitespace-nowrap">
                            {h}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {validation.valid.slice(0, 20).map((row, i) => (
                        <TableRow key={i}>
                          {Object.keys(validation.valid[0]).map((h) => (
                            <TableCell key={h} className="whitespace-nowrap text-sm">
                              {String(row[h] ?? '')}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {validation.valid.length > 20 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Showing 20 of {validation.valid.length} valid rows
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => setStep('mapping')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Mapping
            </Button>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={handleReset}
              >
                Cancel Import
              </Button>
              {validation.validCount > 0 && (
                <Button
                  onClick={handleImport}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      Confirm & Import {validation.validCount} Rows
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 'summary' && importSummary && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                {importSummary.imported > 0 ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <XCircle className="h-6 w-6 text-rose-600" />
                )}
                Import {importSummary.imported > 0 ? 'Completed' : 'Failed'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Imported Rows</p>
                  <p className="text-3xl font-bold tabular-nums text-emerald-600">
                    {importSummary.imported}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Failed Rows</p>
                  <p className="text-3xl font-bold tabular-nums text-rose-600">
                    {importSummary.failed}
                  </p>
                </div>
              </div>

              {validation && (
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Total in File</p>
                    <p className="text-xl font-bold tabular-nums">
                      {validation.totalRows}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Invalid (skipped)</p>
                    <p className="text-xl font-bold tabular-nums text-rose-600">
                      {validation.invalidCount}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Duplicates (skipped)</p>
                    <p className="text-xl font-bold tabular-nums text-amber-600">
                      {validation.duplicateCount}
                    </p>
                  </div>
                </div>
              )}

              {importSummary.errors.length > 0 && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                  <p className="mb-2 text-sm font-medium text-rose-900">
                    Import Errors:
                  </p>
                  <ul className="list-inside list-disc space-y-1 text-sm text-rose-700">
                    {importSummary.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                  {importSummary.errors.length > 10 && (
                    <p className="mt-2 text-xs text-rose-600">
                      And {importSummary.errors.length - 10} more errors...
                    </p>
                  )}
                </div>
              )}

              {importSummary.importId && (
                <p className="text-xs text-muted-foreground">
                  Import ID: {importSummary.importId}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-center gap-2">
            <Button onClick={handleReset}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Start New Import
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
