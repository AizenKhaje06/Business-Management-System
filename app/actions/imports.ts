'use server';

import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getCurrentUserContext } from '@/lib/auth/authorization';
import { logAuditForCurrentUser } from '@/lib/audit';
import {
  type ImportEntityType,
  type ParsedFileData,
  type ValidationResult,
  type ImportSummary,
  type ImportHistoryEntry,
  ENTITY_COLUMNS,
} from '@/lib/import-config';

export async function parseFile(
  fileBuffer: ArrayBuffer,
  fileType: string
): Promise<ParsedFileData> {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: true,
  });

  if (rawData.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const headers = Object.keys(rawData[0]);
  return { headers, rows: rawData, totalRows: rawData.length };
}

export async function validateImportData(
  entityType: ImportEntityType,
  rows: Record<string, unknown>[],
  columnMapping: Record<string, string>
): Promise<ValidationResult> {
  const columns = ENTITY_COLUMNS[entityType];
  const supabase = createSupabaseServerClient();

  const valid: Record<string, unknown>[] = [];
  const invalid: ValidationResult['invalid'] = [];
  const duplicates: ValidationResult['duplicates'] = [];

  let existingRecords: Record<string, unknown>[] = [];
  if (entityType === 'clients') {
    const { data } = await supabase.from('clients').select('name, email');
    existingRecords = (data || []) as Record<string, unknown>[];
  } else if (entityType === 'suppliers') {
    const { data } = await supabase.from('suppliers').select('name, email');
    existingRecords = (data || []) as Record<string, unknown>[];
  } else if (entityType === 'projects') {
    const { data } = await supabase.from('projects').select('name, project_code');
    existingRecords = (data || []) as Record<string, unknown>[];
  } else if (entityType === 'materials') {
    const { data } = await supabase.from('materials').select('name, sku');
    existingRecords = (data || []) as Record<string, unknown>[];
  }

  const existingKeys = new Set<string>();
  for (const rec of existingRecords) {
    const name = String(rec.name || '').toLowerCase().trim();
    if (name) existingKeys.add(name);
  }

  for (let i = 0; i < rows.length; i++) {
    const sourceRow = rows[i];
    const mappedRow: Record<string, unknown> = {};
    const errors: string[] = [];

    for (const col of columns) {
      const sourceColumn = columnMapping[col.field];
      if (sourceColumn && sourceColumn !== 'skip') {
        let value = sourceRow[sourceColumn];
        if (value !== undefined && value !== null) {
          if (typeof value === 'string') value = value.trim();
          if (value !== '') mappedRow[col.field] = value;
        }
      }
    }

    for (const col of columns) {
      if (col.required) {
        const val = mappedRow[col.field];
        if (val === undefined || val === null || val === '') {
          errors.push(`Missing required field: ${col.label}`);
        }
      }
    }

    for (const col of columns) {
      const val = mappedRow[col.field];
      if (val === undefined || val === null || val === '') continue;

      if (col.type === 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          errors.push(`${col.label} must be a number, got "${val}"`);
        } else {
          mappedRow[col.field] = num;
        }
      } else if (col.type === 'email') {
        const str = String(val);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
          errors.push(`${col.label} is not a valid email: "${str}"`);
        }
      } else if (col.type === 'date') {
        const str = String(val);
        const date = new Date(str);
        if (isNaN(date.getTime())) {
          errors.push(`${col.label} is not a valid date: "${str}"`);
        } else {
          mappedRow[col.field] = date.toISOString().split('T')[0];
        }
      } else if (col.type === 'enum') {
        const str = String(val).toLowerCase();
        if (col.enumValues && !col.enumValues.includes(str)) {
          errors.push(
            `${col.label} must be one of: ${col.enumValues.join(', ')} (got "${str}")`
          );
        } else {
          mappedRow[col.field] = str;
        }
      }
    }

    if (errors.length > 0) {
      invalid.push({ row: sourceRow, rowIndex: i + 2, errors });
      continue;
    }

    const nameField = mappedRow['name'] as string | undefined;
    if (nameField && existingKeys.has(nameField.toLowerCase().trim())) {
      duplicates.push({
        row: sourceRow,
        rowIndex: i + 2,
        duplicateOf: nameField,
      });
      continue;
    }

    valid.push(mappedRow);
  }

  return {
    valid,
    invalid,
    duplicates,
    totalRows: rows.length,
    validCount: valid.length,
    invalidCount: invalid.length,
    duplicateCount: duplicates.length,
  };
}

export async function executeImport(
  entityType: ImportEntityType,
  validRows: Record<string, unknown>[],
  fileName: string,
  fileType: string,
  validation: ValidationResult,
  columnMapping: Record<string, string>
): Promise<ImportSummary> {
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    return { imported: 0, failed: 0, errors: ['Not authenticated'], importId: '' };
  }

  const requiredPermissions: Record<string, string> = {
    clients: 'contacts.create',
    suppliers: 'contacts.create',
    projects: 'invoices.create',
    payments: 'invoices.create',
    expenses: 'invoices.create',
    materials: 'inventory.create',
  };
  const required = requiredPermissions[entityType];
  if (required && !ctx.permissions.includes(required as never)) {
    return { imported: 0, failed: 0, errors: ['You do not have permission to import this entity type.'], importId: '' };
  }

  const supabase = createSupabaseServerClient();

  const { data: historyRecord, error: historyError } = await supabase
    .from('import_history')
    .insert({
      entity_type: entityType,
      file_name: fileName,
      file_type: fileType,
      total_rows: validation.totalRows,
      valid_rows: validation.validCount,
      invalid_rows: validation.invalidCount,
      duplicate_rows: validation.duplicateCount,
      imported_rows: 0,
      status: 'pending',
      column_mapping: columnMapping,
      error_details: {
        invalid: validation.invalid.slice(0, 100),
        duplicates: validation.duplicates.slice(0, 100),
      },
      imported_by: ctx.id,
    })
    .select()
    .single();

  if (historyError || !historyRecord) {
    return {
      imported: 0,
      failed: validRows.length,
      errors: [`Failed to create import record: ${historyError?.message || 'Unknown'}`],
      importId: '',
    };
  }

  const importId = historyRecord.id;
  const errors: string[] = [];
  let imported = 0;

  const tableName = entityType === 'payments' ? 'project_payments' : entityType;

  const rowsToInsert = validRows.map((row) => {
    const enriched = { ...row };
    if (
      entityType === 'clients' ||
      entityType === 'projects' ||
      entityType === 'payments'
    ) {
      (enriched as Record<string, unknown>).created_by = ctx.id;
    }
    return enriched;
  });

  if (entityType === 'payments') {
    const projectCodes = rowsToInsert
      .map((r) => r.project_code as string)
      .filter(Boolean);
    if (projectCodes.length > 0) {
      const { data: projects } = await supabase
        .from('projects')
        .select('id, project_code')
        .in('project_code', projectCodes);
      const codeMap = new Map(
        (projects || []).map((p) => [p.project_code, p.id])
      );
      for (const row of rowsToInsert) {
        const code = row.project_code as string;
        if (code && codeMap.has(code)) {
          row.project_id = codeMap.get(code);
          delete row.project_code;
        } else {
          errors.push(`Could not find project with code: ${code}`);
        }
      }
    }
  }

  if (entityType === 'expenses') {
    const { data: categories } = await supabase
      .from('expense_categories')
      .select('id, name')
      .eq('is_active', true)
      .limit(1);
    if (categories && categories.length > 0) {
      const defaultCategoryId = categories[0].id;
      for (const row of rowsToInsert) {
        (row as Record<string, unknown>).category_id = defaultCategoryId;
      }
    }
  }

  const BATCH_SIZE = 50;
  for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
    const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
    const { error: insertError } = await supabase
      .from(tableName)
      .insert(batch);

    if (insertError) {
      errors.push(
        `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${insertError.message}`
      );
    } else {
      imported += batch.length;
    }
  }

  await supabase
    .from('import_history')
    .update({
      imported_rows: imported,
      status: imported > 0 ? 'completed' : 'failed',
      completed_at: new Date().toISOString(),
      error_details: {
        invalid: validation.invalid.slice(0, 100),
        duplicates: validation.duplicates.slice(0, 100),
        import_errors: errors,
      },
    })
    .eq('id', importId);

  revalidatePath('/import');
  revalidatePath('/import/history');
  revalidatePath(`/${entityType}`);

  await logAuditForCurrentUser(ctx.id, 'import', entityType, {
    entityName: fileName,
    newValues: { imported, failed: validRows.length - imported, total_rows: validation.totalRows },
  });

  return {
    imported,
    failed: validRows.length - imported,
    errors,
    importId,
  };
}

export async function cancelImport(
  importId: string
): Promise<{ success: boolean }> {
  const ctx = await getCurrentUserContext();
  if (!ctx) return { success: false };

  const supabase = createSupabaseServerClient();
  await supabase
    .from('import_history')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    })
    .eq('id', importId)
    .eq('imported_by', ctx.id);

  revalidatePath('/import/history');
  return { success: true };
}

export async function getImportHistory(): Promise<ImportHistoryEntry[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from('import_history')
    .select('*, importer:profiles!import_history_imported_by_fkey(email)')
    .order('created_at', { ascending: false })
    .limit(50);

  if (!data) return [];

  return data.map((row) => {
    const importer = row.importer as unknown as { email: string } | null;
    return {
      id: row.id,
      entity_type: row.entity_type,
      file_name: row.file_name,
      file_type: row.file_type,
      total_rows: row.total_rows,
      valid_rows: row.valid_rows,
      invalid_rows: row.invalid_rows,
      duplicate_rows: row.duplicate_rows,
      imported_rows: row.imported_rows,
      status: row.status,
      error_details: row.error_details,
      column_mapping: row.column_mapping,
      created_at: row.created_at,
      completed_at: row.completed_at,
      imported_by_email: importer?.email ?? null,
    };
  });
}
