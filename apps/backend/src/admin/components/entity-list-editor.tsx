import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Switch,
  Table,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { sdk } from "../lib/sdk"

export type FieldDef = {
  key: string
  label: string
  type?: "text" | "textarea" | "number" | "boolean" | "datetime"
  required?: boolean
  dir?: "rtl" | "ltr"
  hint?: string
}

type Row = Record<string, unknown> & { id: string }

// Generic list + drawer editor for a store-content collection
// (hero slides, trust badges). The backend validates every field.
export function EntityListEditor({
  title,
  description,
  endpoint,
  listKey,
  itemKey,
  fields,
  columns,
}: {
  title: string
  description: string
  endpoint: string
  listKey: string
  itemKey: string
  fields: FieldDef[]
  columns: { key: string; label: string }[]
}) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Row | "new" | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: [endpoint],
    queryFn: () => sdk.client.fetch<Record<string, Row[]>>(endpoint),
  })
  const rows = data?.[listKey] ?? []

  const remove = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`${endpoint}/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("تم الحذف")
      queryClient.invalidateQueries({ queryKey: [endpoint] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">{title}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {description}
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => setEditing("new")}>
          إضافة
        </Button>
      </div>
      {isLoading ? (
        <Text className="px-6 py-4">جاري التحميل…</Text>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              {columns.map((c) => (
                <Table.HeaderCell key={c.key}>{c.label}</Table.HeaderCell>
              ))}
              <Table.HeaderCell>الحالة</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {rows.map((row) => (
              <Table.Row key={row.id}>
                {columns.map((c) => (
                  <Table.Cell key={c.key}>{String(row[c.key] ?? "—")}</Table.Cell>
                ))}
                <Table.Cell>
                  <Badge color={row.is_active ? "green" : "grey"} size="2xsmall">
                    {row.is_active ? "مفعّل" : "متوقف"}
                  </Badge>
                </Table.Cell>
                <Table.Cell className="text-end">
                  <div className="flex justify-end gap-2">
                    <Button size="small" variant="transparent" onClick={() => setEditing(row)}>
                      تعديل
                    </Button>
                    <Button
                      size="small"
                      variant="transparent"
                      onClick={() => {
                        if (window.confirm("حذف هذا العنصر؟")) {
                          remove.mutate(row.id)
                        }
                      }}
                    >
                      حذف
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
      {editing && (
        <EditDrawer
          key={editing === "new" ? "new" : editing.id}
          row={editing === "new" ? null : editing}
          endpoint={endpoint}
          itemKey={itemKey}
          fields={fields}
          onClose={() => setEditing(null)}
        />
      )}
    </Container>
  )
}

const toInputValue = (field: FieldDef, value: unknown) => {
  if (value === null || value === undefined) {
    return field.type === "boolean" ? true : ""
  }
  if (field.type === "datetime") {
    // <input type="datetime-local"> wants local "YYYY-MM-DDTHH:mm".
    const d = new Date(String(value))
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  return value
}

function EditDrawer({
  row,
  endpoint,
  itemKey,
  fields,
  onClose,
}: {
  row: Row | null
  endpoint: string
  itemKey: string
  fields: FieldDef[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, toInputValue(f, row?.[f.key])]))
  )

  const save = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {}
      for (const f of fields) {
        const v = values[f.key]
        if (f.type === "number") {
          body[f.key] = v === "" ? undefined : Number(v)
        } else if (f.type === "boolean") {
          body[f.key] = Boolean(v)
        } else if (f.type === "datetime") {
          body[f.key] = v ? new Date(String(v)).toISOString() : null
        } else {
          body[f.key] = v === "" ? (f.required ? "" : null) : v
        }
      }
      return sdk.client.fetch<Record<string, Row>>(
        row ? `${endpoint}/${row.id}` : endpoint,
        { method: "POST", body }
      )
    },
    onSuccess: (data) => {
      toast.success("تم الحفظ")
      queryClient.invalidateQueries({ queryKey: [endpoint] })
      if (data?.[itemKey]) {
        onClose()
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{row ? "تعديل" : "إضافة"}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
          {fields.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <Label size="small" weight="plus">
                {f.label}
                {f.required && " *"}
              </Label>
              {f.type === "boolean" ? (
                <Switch
                  checked={Boolean(values[f.key])}
                  onCheckedChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                />
              ) : f.type === "textarea" ? (
                <Textarea
                  dir={f.dir}
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                />
              ) : (
                <Input
                  dir={f.dir}
                  type={
                    f.type === "number"
                      ? "number"
                      : f.type === "datetime"
                        ? "datetime-local"
                        : "text"
                  }
                  value={String(values[f.key] ?? "")}
                  onChange={(e) => setValues((s) => ({ ...s, [f.key]: e.target.value }))}
                />
              )}
              {f.hint && (
                <Text size="xsmall" className="text-ui-fg-muted">
                  {f.hint}
                </Text>
              )}
            </div>
          ))}
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button variant="secondary">إلغاء</Button>
          </Drawer.Close>
          <Button isLoading={save.isPending} onClick={() => save.mutate()}>
            حفظ
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}
