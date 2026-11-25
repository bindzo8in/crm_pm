import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Client, type QueryResultRow } from "pg";

type Row = QueryResultRow & Record<string, unknown>;

interface SourceSpec {
  key: string;
  databaseName: string;
  urlVariable: string;
  primaryCompanyName?: string;
}

interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  hasDefault: boolean;
  identity: boolean;
  generated: boolean;
}

interface ForeignKeyInfo {
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
}

interface TableInfo {
  columns: Map<string, ColumnInfo>;
  primaryKey: string[];
  foreignKeys: ForeignKeyInfo[];
}

interface SourceData {
  spec: SourceSpec;
  client: Client;
  rows: Map<string, Row[]>;
  counts: Map<string, number>;
  primaryCompany: Row | null;
  settingsRow: Row | null;
  organizationId: string;
  userIds: Map<string, string>;
  primaryKeys: Map<string, Map<string, unknown[]>>;
}

const sourceSpecs: SourceSpec[] = [
  {
    key: "aerooceanxcrm",
    databaseName: "aerooceanxcrm",
    urlVariable: "LEGACY_AEROOCEANXCRM_URL",
  },
  {
    key: "b8_crm",
    databaseName: "b8_crm",
    urlVariable: "LEGACY_B8_CRM_URL",
    primaryCompanyName: "Bindzo 8 Private Limited",
  },
  {
    key: "dh_crm",
    databaseName: "dh_crm",
    urlVariable: "LEGACY_DH_CRM_URL",
  },
];

const excludedTables = new Set([
  "_prisma_migrations",
  "session",
  "verification",
  "web_push_subscription",
  "salary_pin",
  "salary_pin_reset_token",
]);

const specialTables = new Set([
  "user",
  "Company",
  "account",
  "attendance_settings",
  "attendance_reminder",
  "attendance_schedule_reminder",
]);

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function rowKey(values: unknown[]): string {
  return JSON.stringify(values);
}

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Set ${name} before running the import.`);
  }
  return value;
}

function getTargetDatabaseUrl(): string {
  return requiredEnvironmentValue("IMPORT_TARGET_URL");
}

function normalizeEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function toText(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function loadTableInfo(target: Client): Promise<Map<string, TableInfo>> {
  const columnsResult = await target.query<Row>(
    `SELECT table_name, column_name, data_type, is_nullable,
            column_default, is_identity, is_generated
     FROM information_schema.columns
     WHERE table_schema = 'public'
     ORDER BY table_name, ordinal_position`,
  );
  const keysResult = await target.query<Row>(
    `SELECT table_name, column_name, ordinal_position
     FROM information_schema.key_column_usage
     WHERE table_schema = 'public'
       AND constraint_name IN (
         SELECT constraint_name
         FROM information_schema.table_constraints
         WHERE table_schema = 'public'
           AND constraint_type = 'PRIMARY KEY'
       )
     ORDER BY table_name, ordinal_position`,
  );
  const foreignKeysResult = await target.query<Row>(
    `SELECT child.relname AS table_name,
            parent.relname AS referenced_table,
            array_agg(child_column.attname::text ORDER BY key_columns.ordinality) AS columns,
            array_agg(parent_column.attname::text ORDER BY key_columns.ordinality) AS referenced_columns
     FROM pg_constraint constraint_row
     JOIN pg_class child ON child.oid = constraint_row.conrelid
     JOIN pg_namespace child_schema ON child_schema.oid = child.relnamespace
     JOIN pg_class parent ON parent.oid = constraint_row.confrelid
     JOIN pg_namespace parent_schema ON parent_schema.oid = parent.relnamespace
     CROSS JOIN LATERAL unnest(constraint_row.conkey, constraint_row.confkey)
       WITH ORDINALITY AS key_columns(child_attnum, parent_attnum, ordinality)
     JOIN pg_attribute child_column
       ON child_column.attrelid = child.oid AND child_column.attnum = key_columns.child_attnum
     JOIN pg_attribute parent_column
       ON parent_column.attrelid = parent.oid AND parent_column.attnum = key_columns.parent_attnum
     WHERE constraint_row.contype = 'f'
       AND child_schema.nspname = 'public'
       AND parent_schema.nspname = 'public'
     GROUP BY child.relname, parent.relname, constraint_row.conname
     ORDER BY child.relname, constraint_row.conname`,
  );

  const tables = new Map<string, TableInfo>();
  const getTable = (name: string): TableInfo => {
    let table = tables.get(name);
    if (!table) {
      table = { columns: new Map(), primaryKey: [], foreignKeys: [] };
      tables.set(name, table);
    }
    return table;
  };

  for (const row of columnsResult.rows) {
    getTable(String(row.table_name)).columns.set(String(row.column_name), {
      name: String(row.column_name),
      dataType: String(row.data_type),
      nullable: row.is_nullable === "YES",
      hasDefault: row.column_default !== null,
      identity: row.is_identity === "YES",
      generated: row.is_generated !== "NEVER",
    });
  }
  for (const row of keysResult.rows) {
    getTable(String(row.table_name)).primaryKey.push(String(row.column_name));
  }
  for (const row of foreignKeysResult.rows) {
    getTable(String(row.table_name)).foreignKeys.push({
      columns: (row.columns as string[]).map(String),
      referencedTable: String(row.referenced_table),
      referencedColumns: (row.referenced_columns as string[]).map(String),
    });
  }
  return tables;
}

async function loadSource(spec: SourceSpec): Promise<SourceData> {
  const client = new Client({
    connectionString: requiredEnvironmentValue(spec.urlVariable),
  });
  await client.connect();

  const database = await client.query<{ database: string }>(
    "SELECT current_database() AS database",
  );
  if (database.rows[0]?.database !== spec.databaseName) {
    await client.end();
    throw new Error(`The source URL for ${spec.key} points to the wrong database.`);
  }

  const tableNames = await client.query<{ tablename: string }>(
    `SELECT tablename
     FROM pg_tables
     WHERE schemaname = 'public'
     ORDER BY tablename`,
  );
  const rows = new Map<string, Row[]>();
  const counts = new Map<string, number>();

  for (const { tablename } of tableNames.rows) {
    const table = quoteIdentifier(tablename);
    const countResult = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM public.${table}`,
    );
    const count = Number(countResult.rows[0]?.count ?? 0);
    if (!count) continue;
    counts.set(tablename, count);
    if (tablename === "_prisma_migrations" || excludedTables.has(tablename)) {
      continue;
    }
    const result = await client.query<Row>(`SELECT * FROM public.${table}`);
    rows.set(tablename, result.rows);
  }

  const companyRows = rows.get("Company") ?? [];
  let primaryCompany: Row | null = null;
  if (companyRows.length) {
    if (spec.primaryCompanyName) {
      primaryCompany =
        companyRows.find(
          (row) =>
            String(row.displayName ?? "").trim().toLowerCase() ===
            spec.primaryCompanyName?.toLowerCase(),
        ) ?? null;
      if (!primaryCompany) {
        await client.end();
        throw new Error(`The expected primary Company record is missing for ${spec.key}.`);
      }
    } else {
      primaryCompany = [...companyRows].sort(
        (a, b) =>
          new Date(String(a.createdAt ?? 0)).getTime() -
          new Date(String(b.createdAt ?? 0)).getTime(),
      )[0];
    }
  }

  const settingsRows = rows.get("attendance_settings") ?? [];
  const settingsRow = [...settingsRows].sort(
    (a, b) =>
      new Date(String(b.updatedAt ?? b.createdAt ?? 0)).getTime() -
      new Date(String(a.updatedAt ?? a.createdAt ?? 0)).getTime(),
  )[0] ?? null;

  return {
    spec,
    client,
    rows,
    counts,
    primaryCompany,
    settingsRow,
    organizationId: randomUUID(),
    userIds: new Map(),
    primaryKeys: new Map(),
  };
}

function chooseOrganizationName(source: SourceData): string {
  const companyName = source.primaryCompany?.displayName ?? source.primaryCompany?.legalName;
  return typeof companyName === "string" && companyName.trim()
    ? companyName.trim()
    : source.spec.databaseName;
}

async function createOrganizations(
  target: Client,
  sources: SourceData[],
): Promise<Map<string, string>> {
  const existing = await target.query<Row>(
    `SELECT id, name, slug, metadata FROM public."organization"`,
  );
  const existingSlugs = new Set(existing.rows.map((row) => String(row.slug)));
  const existingSources = new Set<string>();

  for (const row of existing.rows) {
    let metadata: unknown = row.metadata;
    if (typeof metadata === "string") {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        continue;
      }
    }
    try {
      if (
        metadata &&
        typeof metadata === "object" &&
        "importedFrom" in metadata &&
        typeof metadata.importedFrom === "string"
      ) {
        existingSources.add(metadata.importedFrom);
      }
    } catch {
      continue;
    }
  }

  for (const source of sources) {
    if (existingSources.has(source.spec.databaseName)) {
      throw new Error(`An organization already exists for ${source.spec.databaseName}.`);
    }
  }

  const owner = await target.query<{ userId: string }>(
    `SELECT member."userId"
     FROM public."member" member
     JOIN public."organization" organization ON organization.id = member."organizationId"
     WHERE member.role = 'owner'
     ORDER BY organization."createdAt", member."createdAt", member.id
     LIMIT 1`,
  );
  const ownerId = owner.rows[0]?.userId;
  if (!ownerId) {
    throw new Error("The target has no existing organization owner to assign to imported organizations.");
  }

  const created = new Map<string, string>();
  for (const source of sources) {
    const name = chooseOrganizationName(source);
    const baseSlug = `${slugify(name)}-${slugify(source.spec.databaseName)}` || slugify(source.spec.databaseName);
    let slug = baseSlug;
    let suffix = 2;
    while (existingSlugs.has(slug)) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
    existingSlugs.add(slug);

    await target.query(
      `INSERT INTO public."organization"
         (id, name, slug, metadata, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, now(), now())`,
      [
        source.organizationId,
        name,
        slug,
        JSON.stringify({ importedFrom: source.spec.databaseName }),
      ],
    );
    await target.query(
      `INSERT INTO public."member"
         (id, "organizationId", "userId", role, "createdAt")
       VALUES ($1, $2, $3, 'owner', now())`,
      [randomUUID(), source.organizationId, ownerId],
    );
    created.set(source.spec.databaseName, source.organizationId);
  }
  return created;
}

async function createUsersAndMemberships(
  target: Client,
  sources: SourceData[],
  existingUserIds: Map<string, string>,
  createdUserIds: Set<string>,
): Promise<void> {
  const targetUserEmails = await target.query<Row>(
    `SELECT id, email FROM public."user"`,
  );
  for (const row of targetUserEmails.rows) {
    const email = normalizeEmail(row.email);
    if (!email) continue;
    const current = existingUserIds.get(email);
    if (current && current !== row.id) {
      throw new Error("The target contains ambiguous users with the same normalized email.");
    }
    existingUserIds.set(email, String(row.id));
  }

  for (const source of sources) {
    const userRows = source.rows.get("user") ?? [];
    if (!userRows.length) continue;
    const sourceEmails = new Set<string>();

    for (const row of userRows) {
      const email = normalizeEmail(row.email);
      const sourceId = toText(row.id);
      if (!email || !sourceId) {
        throw new Error(`A source user in ${source.spec.databaseName} is missing an email or id.`);
      }
      if (sourceEmails.has(email)) {
        throw new Error(`The source ${source.spec.databaseName} has duplicate normalized user emails.`);
      }
      sourceEmails.add(email);

      let userId = existingUserIds.get(email);
      if (!userId) {
        userId = randomUUID();
        await target.query(
          `INSERT INTO public."user"
             (id, name, email, "emailVerified", image, "createdAt", "updatedAt", role)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'USER')`,
          [
            userId,
            String(row.name ?? email),
            email,
            row.emailVerified === true,
            row.image ?? null,
            row.createdAt ?? new Date(),
            row.updatedAt ?? new Date(),
          ],
        );
        existingUserIds.set(email, userId);
        createdUserIds.add(userId);
      }
      source.userIds.set(sourceId, userId);
      setPrimaryKeyMap(source, "user", [sourceId], [userId]);

      const sourceRole = String(row.role ?? "").toUpperCase();
      const memberRole =
        sourceRole === "ADMIN" || sourceRole === "SUPER_ADMIN" ? "admin" : "member";
      await target.query(
        `INSERT INTO public."member"
           (id, "organizationId", "userId", role, "createdAt")
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT ("organizationId", "userId") DO NOTHING`,
        [randomUUID(), source.organizationId, userId, memberRole],
      );
    }

    await insertEmployeeProfiles(target, source, userRows);
  }
}

async function insertEmployeeProfiles(
  target: Client,
  source: SourceData,
  userRows: Row[],
): Promise<void> {
  const employeeIds = new Map<string, number>();
  for (const row of userRows) {
    const employeeId = toText(row.employeeId);
    if (employeeId) employeeIds.set(employeeId, (employeeIds.get(employeeId) ?? 0) + 1);
  }

  for (const row of userRows) {
    const sourceUserId = toText(row.id);
    const userId = sourceUserId ? source.userIds.get(sourceUserId) : undefined;
    if (!sourceUserId || !userId) {
      throw new Error(`A source user mapping is missing for ${source.spec.databaseName}.`);
    }
    const employeeId = toText(row.employeeId);
    await target.query(
      `INSERT INTO public."organization_employee_profile" (
        "organizationId", "userId", "sourceDatabase", "sourceUserId", "sourceProfileData",
        "displayName", "applicationRole", "employmentStatus", "employmentEndedAt",
        "department", "additionalDepartments", "workMode", "includeInAttendanceReports",
        "includeInPayroll", "clockInAlarmEnabled", "clockOutAlarmEnabled", "employeeId",
        "designation", "dateOfJoining", "employmentType", "annualCtc", "bankName",
        "bankAccountNo", "bankIfsc", "bankAccountType", "panNo", "aadhaarNo",
        "costCenter", "uanNo", "pfNo", "esiNo", "pfEligible", "esiEligible",
        "taxRegime", "paymentMethod", "createdAt", "updatedAt"
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37
      )`,
      [
        source.organizationId,
        userId,
        source.spec.databaseName,
        sourceUserId,
        row,
        row.name ?? null,
        row.role ?? null,
        row.employmentStatus ?? null,
        row.employmentEndedAt ?? null,
        row.department ?? null,
        row.additional_departments ?? [],
        row.workMode ?? null,
        row.include_in_attendance_reports ?? null,
        row.include_in_payroll ?? null,
        row.clockInAlarmEnabled ?? null,
        row.clockOutAlarmEnabled ?? null,
        employeeId && employeeIds.get(employeeId) === 1 ? employeeId : null,
        row.designation ?? null,
        row.dateOfJoining ?? null,
        row.employmentType ?? null,
        row.annualCtc ?? null,
        row.bankName ?? null,
        row.bankAccountNo ?? null,
        row.bankIfsc ?? null,
        row.bankAccountType ?? null,
        row.panNo ?? null,
        row.aadhaarNo ?? null,
        row.costCenter ?? null,
        row.uanNo ?? null,
        row.pfNo ?? null,
        row.esiNo ?? null,
        row.pfEligible ?? null,
        row.esiEligible ?? null,
        row.taxRegime ?? null,
        row.paymentMethod ?? null,
        new Date(),
        new Date(),
      ],
    );
  }
}

function setPrimaryKeyMap(
  source: SourceData,
  tableName: string,
  sourceValues: unknown[],
  targetValues: unknown[],
): void {
  let tableMap = source.primaryKeys.get(tableName);
  if (!tableMap) {
    tableMap = new Map();
    source.primaryKeys.set(tableName, tableMap);
  }
  tableMap.set(rowKey(sourceValues), targetValues);
}

function getPrimaryKeyMap(
  source: SourceData,
  tableName: string,
  sourceValues: unknown[],
): unknown[] | undefined {
  return source.primaryKeys.get(tableName)?.get(rowKey(sourceValues));
}

function prepareSinglePrimaryKeys(
  source: SourceData,
  tableInfo: Map<string, TableInfo>,
  genericTables: Set<string>,
): void {
  for (const tableName of genericTables) {
    const info = tableInfo.get(tableName);
    if (!info || info.primaryKey.length !== 1) continue;
    const columnName = info.primaryKey[0];
    const column = info.columns.get(columnName);
    if (!column) continue;
    const rows = source.rows.get(tableName) ?? [];
    for (const row of rows) {
      const oldValue = row[columnName];
      const targetValue =
        column.dataType === "integer" ||
        column.dataType === "bigint" ||
        column.dataType === "smallint"
          ? oldValue
          : randomUUID();
      setPrimaryKeyMap(source, tableName, [oldValue], [targetValue]);
    }
  }
}

function topologicalOrder(
  tableNames: Set<string>,
  tableInfo: Map<string, TableInfo>,
): string[] {
  const pending = new Set(tableNames);
  const ordered: string[] = [];

  while (pending.size) {
    const ready = [...pending].filter((tableName) =>
      (tableInfo.get(tableName)?.foreignKeys ?? []).every(
        (foreignKey) =>
          foreignKey.referencedTable === tableName ||
          !pending.has(foreignKey.referencedTable),
      ),
    );
    if (!ready.length) {
      throw new Error("The populated source tables contain a cyclic cross-table dependency.");
    }
    for (const tableName of ready) {
      pending.delete(tableName);
      ordered.push(tableName);
    }
  }
  return ordered;
}

interface DeferredForeignKeyUpdate {
  tableName: string;
  primaryKeyColumns: string[];
  primaryKeyValues: unknown[];
  values: Map<string, unknown>;
}

function prepareGenericRow(
  source: SourceData,
  tableName: string,
  sourceRow: Row,
  info: TableInfo,
  includedTables: Set<string>,
  deferredUpdates: DeferredForeignKeyUpdate[],
): Row {
  const row: Row = { ...sourceRow };
  if (info.columns.has("organizationId")) {
    row.organizationId = source.organizationId;
  }

  const singlePkMap =
    info.primaryKey.length === 1
      ? getPrimaryKeyMap(source, tableName, [sourceRow[info.primaryKey[0]]])
      : undefined;
  if (singlePkMap) row[info.primaryKey[0]] = singlePkMap[0];

  for (const foreignKey of info.foreignKeys) {
    if (foreignKey.columns.includes("organizationId")) continue;
    const oldValues = foreignKey.columns.map((column) => sourceRow[column]);
    if (oldValues.some((value) => value === null || value === undefined)) continue;
    const mappedValues = getPrimaryKeyMap(source, foreignKey.referencedTable, oldValues);
    if (!mappedValues) {
      if (includedTables.has(foreignKey.referencedTable)) {
        throw new Error(
          `A referenced ${foreignKey.referencedTable} record is missing while importing ${tableName}.`,
        );
      }
      continue;
    }

    if (foreignKey.referencedTable === tableName) {
      const updateValues = new Map<string, unknown>();
      foreignKey.columns.forEach((column, index) => {
        if (!info.columns.get(column)?.nullable) {
          throw new Error(`A self-reference in ${tableName} cannot be deferred safely.`);
        }
        updateValues.set(column, mappedValues[index]);
        row[column] = null;
      });
      if (info.primaryKey.length) {
        const primaryKeyValues = info.primaryKey.map((column) => row[column]);
        deferredUpdates.push({
          tableName,
          primaryKeyColumns: info.primaryKey,
          primaryKeyValues,
          values: updateValues,
        });
      }
      continue;
    }

    foreignKey.columns.forEach((column, index) => {
      row[column] = mappedValues[index];
    });
  }

  if (info.primaryKey.length > 1) {
    const sourceValues = info.primaryKey.map((column) => sourceRow[column]);
    const targetValues = info.primaryKey.map((column) => row[column]);
    setPrimaryKeyMap(source, tableName, sourceValues, targetValues);
  }

  return row;
}

async function insertRows(
  target: Client,
  tableName: string,
  rows: Row[],
  info: TableInfo,
): Promise<void> {
  if (!rows.length) return;
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].filter(
    (name) => info.columns.has(name) && !info.columns.get(name)?.generated,
  );
  const provided = new Set(columns);
  const missingRequired = [...info.columns.values()].filter(
    (column) =>
      !column.nullable &&
      !column.hasDefault &&
      !column.identity &&
      !column.generated &&
      !provided.has(column.name),
  );
  if (missingRequired.length) {
    throw new Error(
      `The target requires unmapped columns in ${tableName}: ${missingRequired.map((column) => column.name).join(", ")}.`,
    );
  }

  const maxRowsPerInsert = Math.max(1, Math.floor(30000 / columns.length));
  for (let offset = 0; offset < rows.length; offset += maxRowsPerInsert) {
    const batch = rows.slice(offset, offset + maxRowsPerInsert);
    const values: unknown[] = [];
    const placeholders = batch.map((row, rowIndex) => {
      const rowPlaceholders = columns.map((column, columnIndex) => {
        const value = row[column] ?? null;
        const dataType = info.columns.get(column)?.dataType;
        values.push(
          value !== null &&
            (dataType === "json" || dataType === "jsonb") &&
            typeof value !== "string"
            ? JSON.stringify(value)
            : value,
        );
        return `$${rowIndex * columns.length + columnIndex + 1}`;
      });
      return `(${rowPlaceholders.join(", ")})`;
    });
    try {
      await target.query(
        `INSERT INTO public.${quoteIdentifier(tableName)}
           (${columns.map(quoteIdentifier).join(", ")})
         VALUES ${placeholders.join(", ")}`,
        values,
      );
    } catch (error) {
      console.error(`Insert failed for source table ${tableName}.`);
      throw error;
    }
  }
}

async function archiveSourceRow(
  target: Client,
  source: SourceData,
  sourceTable: string,
  sourceRecordId: unknown,
  data: unknown,
): Promise<void> {
  await target.query(
    `INSERT INTO public."imported_source_record"
       (id, "organizationId", "sourceDatabase", "sourceTable", "sourceRecordId", data)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      randomUUID(),
      source.organizationId,
      source.spec.databaseName,
      sourceTable,
      String(sourceRecordId),
      data,
    ],
  );
}

async function insertCompanyAndSettings(
  target: Client,
  source: SourceData,
  tableInfo: Map<string, TableInfo>,
): Promise<void> {
  const companyRows = source.rows.get("Company") ?? [];
  if (companyRows.length && source.primaryCompany) {
    const companyInfo = tableInfo.get("Company");
    if (!companyInfo) throw new Error("The target Company table is unavailable.");
    const sourceId = source.primaryCompany.id;
    const companyId = randomUUID();
    setPrimaryKeyMap(source, "Company", [sourceId], [companyId]);
    const row: Row = { ...source.primaryCompany, id: companyId, organizationId: source.organizationId };
    await insertRows(target, "Company", [row], companyInfo);

    for (const company of companyRows) {
      await archiveSourceRow(target, source, "Company", company.id, {
        isPrimary: company.id === sourceId,
        record: company,
      });
    }
  }

  const settingsRows = source.rows.get("attendance_settings") ?? [];
  if (source.settingsRow) {
    const settingsInfo = tableInfo.get("attendance_settings");
    if (!settingsInfo) throw new Error("The target attendance settings table is unavailable.");
    const settingsId = randomUUID();
    setPrimaryKeyMap(source, "attendance_settings", [source.settingsRow.id], [settingsId]);
    await insertRows(
      target,
      "attendance_settings",
      [
        {
          ...source.settingsRow,
          id: settingsId,
          organizationId: source.organizationId,
        },
      ],
      settingsInfo,
    );
    for (const settings of settingsRows) {
      if (settings.id !== source.settingsRow.id) {
        await archiveSourceRow(target, source, "attendance_settings", settings.id, settings);
      }
    }
  }
}

async function insertSourceAccounts(
  target: Client,
  source: SourceData,
  tableInfo: Map<string, TableInfo>,
  createdUserIds: Set<string>,
  copiedAccountKeys: Set<string>,
): Promise<number> {
  const rows = source.rows.get("account") ?? [];
  const info = tableInfo.get("account");
  if (!rows.length || !info) return 0;
  const importedRows: Row[] = [];

  for (const sourceRow of rows) {
    const sourceUserId = toText(sourceRow.userId);
    const userId = sourceUserId ? source.userIds.get(sourceUserId) : undefined;
    if (!userId || !createdUserIds.has(userId)) continue;

    const accountKey = `${userId}\u0000${String(sourceRow.providerId)}\u0000${String(sourceRow.accountId)}`;
    if (copiedAccountKeys.has(accountKey)) continue;
    copiedAccountKeys.add(accountKey);

    const row: Row = { ...sourceRow, id: randomUUID(), userId };
    for (const secret of [
      "accessToken",
      "refreshToken",
      "idToken",
      "accessTokenExpiresAt",
      "refreshTokenExpiresAt",
      "scope",
    ]) {
      if (info.columns.has(secret)) row[secret] = null;
    }
    if (String(sourceRow.providerId).toLowerCase() !== "credential") {
      if (info.columns.has("password")) row.password = null;
    }
    importedRows.push(row);
  }

  await insertRows(target, "account", importedRows, info);
  return importedRows.length;
}

async function archiveOperationalReminders(
  target: Client,
  source: SourceData,
): Promise<number> {
  let archived = 0;
  for (const tableName of ["attendance_reminder", "attendance_schedule_reminder"]) {
    for (const row of source.rows.get(tableName) ?? []) {
      const sourceUserId = toText(row.userId ?? row.user_id);
      const targetUserId = sourceUserId ? source.userIds.get(sourceUserId) : undefined;
      if (sourceUserId && !targetUserId) {
        throw new Error(`A reminder user mapping is missing for ${source.spec.databaseName}.`);
      }
      await archiveSourceRow(target, source, tableName, row.id, {
        record: row,
        targetUserId: targetUserId ?? null,
      });
      archived += 1;
    }
  }
  return archived;
}

async function updateSequences(
  target: Client,
  importedTables: Set<string>,
  tableInfo: Map<string, TableInfo>,
): Promise<void> {
  for (const tableName of importedTables) {
    const info = tableInfo.get(tableName);
    if (!info) continue;
    for (const column of info.columns.values()) {
      if (
        !["integer", "bigint", "smallint"].includes(column.dataType) ||
        (!column.hasDefault && !column.identity)
      ) {
        continue;
      }

      const relation = `public.${quoteIdentifier(tableName)}`;
      const sequence = await target.query<{ sequence: string | null }>(
        "SELECT pg_get_serial_sequence($1, $2) AS sequence",
        [relation, column.name],
      );
      const sequenceName = sequence.rows[0]?.sequence;
      if (!sequenceName) continue;

      const maxValue = await target.query<{ max: string | null }>(
        `SELECT max(${quoteIdentifier(column.name)})::text AS max
         FROM public.${quoteIdentifier(tableName)}`,
      );
      const max = maxValue.rows[0]?.max;
      if (max !== null && max !== undefined) {
        await target.query(
          `SELECT setval(
             $1::regclass,
             GREATEST(COALESCE(pg_sequence_last_value($1::regclass), 0), $2::bigint),
             true
           )`,
          [sequenceName, max],
        );
      }
    }
  }
}

async function importSourceRows(
  target: Client,
  source: SourceData,
  tableInfo: Map<string, TableInfo>,
  accountKeys: Set<string>,
  createdUserIds: Set<string>,
): Promise<Map<string, number>> {
  const genericTables = new Set(
    [...source.rows.keys()].filter(
      (tableName) => !specialTables.has(tableName) && !excludedTables.has(tableName),
    ),
  );
  prepareSinglePrimaryKeys(source, tableInfo, genericTables);

  const includedTables = new Set([
    ...genericTables,
    ...specialTables,
  ]);
  const orderedTables = topologicalOrder(genericTables, tableInfo);
  const importedCounts = new Map<string, number>();
  const deferredUpdates: DeferredForeignKeyUpdate[] = [];

  await insertCompanyAndSettings(target, source, tableInfo);
  importedCounts.set("Company", source.primaryCompany ? 1 : 0);
  importedCounts.set("attendance_settings", source.settingsRow ? 1 : 0);
  importedCounts.set(
    "ArchivedReminders",
    await archiveOperationalReminders(target, source),
  );

  const accountCount = await insertSourceAccounts(
    target,
    source,
    tableInfo,
    createdUserIds,
    accountKeys,
  );
  importedCounts.set("account", accountCount);

  for (const tableName of orderedTables) {
    const info = tableInfo.get(tableName);
    if (!info) throw new Error(`The target table ${tableName} is unavailable.`);
    const sourceRows = source.rows.get(tableName) ?? [];
    const transformed = sourceRows.map((row) =>
      prepareGenericRow(source, tableName, row, info, includedTables, deferredUpdates),
    );
    if (tableName === "Customer") {
      await target.query("SET LOCAL app.allow_legacy_customer_name_duplicates = 'on'");
    }
    await insertRows(target, tableName, transformed, info);
    if (tableName === "Customer") {
      await target.query("SET LOCAL app.allow_legacy_customer_name_duplicates = 'off'");
    }
    importedCounts.set(tableName, transformed.length);
  }

  for (const update of deferredUpdates) {
    const assignments = [...update.values.entries()];
    const setClause = assignments
      .map(([column], index) => `${quoteIdentifier(column)} = $${index + 1}`)
      .join(", ");
    const whereClause = update.primaryKeyColumns
      .map((column, index) => `${quoteIdentifier(column)} = $${assignments.length + index + 1}`)
      .join(" AND ");
    await target.query(
      `UPDATE public.${quoteIdentifier(update.tableName)}
       SET ${setClause}
       WHERE ${whereClause}`,
      [...assignments.map(([, value]) => value), ...update.primaryKeyValues],
    );
  }

  return importedCounts;
}

function mapExistingUsers(rows: Row[]): Map<string, string> {
  const users = new Map<string, string>();
  for (const row of rows) {
    const email = normalizeEmail(row.email);
    if (!email) continue;
    const userId = String(row.id);
    const previous = users.get(email);
    if (previous && previous !== userId) {
      throw new Error("The target has ambiguous normalized user identities.");
    }
    users.set(email, userId);
  }
  return users;
}

function printReport(
  sources: SourceData[],
  importedBySource: Map<string, Map<string, number>>,
  apply: boolean,
): void {
  console.log(apply ? "Import committed." : "Dry run complete; target transaction rolled back.");
  for (const source of sources) {
    const imported = importedBySource.get(source.spec.databaseName) ?? new Map();
    const rows = [...imported.entries()]
      .filter(([, count]) => count > 0)
      .map(([table, count]) => `${table}=${count}`)
      .join(", ");
    const skipped = [...source.counts.entries()]
      .filter(([table, count]) => count > 0 && excludedTables.has(table))
      .map(([table, count]) => `${table}=${count}`)
      .join(", ");
    console.log(`${source.spec.databaseName}: ${rows}`);
    if (skipped) console.log(`${source.spec.databaseName} excluded operational/auth rows: ${skipped}`);
  }
}

async function run(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const target = new Client({ connectionString: getTargetDatabaseUrl() });
  const sources: SourceData[] = [];

  try {
    await target.connect();
    const database = await target.query<{ database: string }>(
      "SELECT current_database() AS database",
    );
    if (database.rows[0]?.database !== "b8crmv2") {
      throw new Error("The import target must be the b8crmv2 database.");
    }

    for (const spec of sourceSpecs) {
      sources.push(await loadSource(spec));
    }

    const tableInfo = await loadTableInfo(target);
    for (const source of sources) {
      for (const tableName of source.rows.keys()) {
        if (!tableInfo.has(tableName)) {
          throw new Error(`The target has no table for populated source table ${tableName}.`);
        }
      }
    }

    await target.query("BEGIN");
    try {
      const existingRows = await target.query<Row>(
        `SELECT id, email FROM public."user"`,
      );
      const existingUserIds = mapExistingUsers(existingRows.rows);
      const createdUserIds = new Set<string>();
      const importedBySource = new Map<string, Map<string, number>>();
      const accountKeys = new Set<string>();

      await createOrganizations(target, sources);
      await createUsersAndMemberships(
        target,
        sources,
        existingUserIds,
        createdUserIds,
      );

      for (const source of sources) {
        const imported = await importSourceRows(
          target,
          source,
          tableInfo,
          accountKeys,
          createdUserIds,
        );
        imported.set("UserProfile", (source.rows.get("user") ?? []).length);
        imported.set("Organization", 1);
        imported.set("OwnerMembership", 1);
        importedBySource.set(source.spec.databaseName, imported);
      }

      if (apply) {
        const importedTables = new Set(
          [...importedBySource.values()].flatMap((counts) =>
            [...counts.entries()].filter(([, count]) => count > 0).map(([table]) => table),
          ),
        );
        await updateSequences(target, importedTables, tableInfo);
        await target.query("COMMIT");
      } else {
        await target.query("ROLLBACK");
      }
      printReport(sources, importedBySource, apply);
    } catch (error) {
      await target.query("ROLLBACK");
      throw error;
    }
  } finally {
    await Promise.all([
      target.end(),
      ...sources.map((source) => source.client.end()),
    ]);
  }
}

run().catch((error: unknown) => {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    console.error(`Import failed with PostgreSQL error ${error.code}; transaction rolled back.`);
    for (const field of ["table", "constraint", "column"] as const) {
      const value = Reflect.get(error, field);
      if (typeof value === "string") {
        console.error(`${field}: ${value}`);
      }
    }
    const message = Reflect.get(error, "message");
    if (
      (error.code === "42601" || error.code === "22P02") &&
      typeof message === "string"
    ) {
      console.error(message.replace(/"[^"]*"/g, '"<redacted>"'));
    }
  } else {
    console.error(error instanceof Error ? error.message : "Import failed; transaction rolled back.");
  }
  process.exitCode = 1;
});
