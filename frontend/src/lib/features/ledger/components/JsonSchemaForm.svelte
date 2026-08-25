<script lang="ts">
import JsonSchemaForm from "./JsonSchemaForm.svelte";
import { sha256Hex } from "$lib/shared/utils/crypto";
import type { JSONSchema7, JSONSchema7Definition } from "json-schema";
import Select from "svelte-select";
import { isEqual, startCase } from "es-toolkit";
import PriceCodeSearchModal from "./PriceCodeSearchModal.svelte";
import { iconGlyph, iconsList } from "$lib/shared/ui/icon";
import AccountSelect from "./AccountsSelect.svelte";
import { untrack } from "svelte";
import FormField from "$lib/shared/layout/FormField.svelte";
import Input from "$lib/shared/ui/Input.svelte";
import UiSelect from "$lib/shared/ui/Select.svelte";
import IconButton from "$lib/shared/ui/IconButton.svelte";
import { sortBy } from "$lib/shared/utils/collection";

interface Schema extends JSONSchema7 {
  "ui:header"?: string;
  "ui:widget"?: string;
  "ui:order"?: number;
}

interface Props {
  key: string;
  value: any;
  rawValue?: string;
  schema: Schema;
  depth?: number;
  required?: boolean;
  deletable?: (() => void) | null;
  disabled?: boolean;
  allAccounts?: string[];
  modalOpen?: boolean;
  variant?: "default" | "panel" | "item";
}

const ICON_MAX_RESULTS = 200;

let {
  key,
  value = $bindable(),
  rawValue = $bindable(""),
  schema,
  depth = 0,
  required = false,
  deletable = null,
  disabled = false,
  allAccounts = [],
  modalOpen = $bindable(false),
  variant = "default",
}: Props = $props();

const radioInstanceId = crypto.randomUUID();
let radioName = $derived(`${key || "field"}-${radioInstanceId}`);
let fieldId = $derived(`${key || "field"}-${radioInstanceId}`);
let open = $state(untrack(() => variant === "panel" || variant === "item"));
let title = $derived(startCase(key));
let itemTitle = $derived(
  schema["ui:header"] && value && value[schema["ui:header"]]
    ? String(value[schema["ui:header"]])
    : title || "Item",
);

function newItem(listSchema: any) {
  if (listSchema.default?.[0] != null) {
    return structuredClone(listSchema.default[0]);
  }
  return {};
}

function isSchema(definition: JSONSchema7Definition): definition is Schema {
  return definition !== false;
}

function isCompoundSchema(subSchema: Schema) {
  return subSchema.type === "object" || subSchema.type === "array";
}

function sortedProperties(schema: Schema): [string, Schema][] {
  const entries = Object.entries(schema.properties || {})
    .filter((entry): entry is [string, Schema] => isSchema(entry[1]));
  return sortBy(entries, ([key, subSchema]) => {
    return [
      subSchema["ui:order"] || 999,
      (schema.required || []).includes(key) ? 0 : 1,
      subSchema.type == "object" ? 2 : subSchema.type == "array" ? 3 : 1,
      key,
    ];
  });
}

function defaultValueForSchema(s: Schema) {
  if (s.default !== undefined) {
    return structuredClone(s.default);
  }
  if (s.type === "array") {
    return [];
  }
  if (s.type === "object" || s["ui:widget"] === "price") {
    return {};
  }
  return undefined;
}

$effect.pre(() => {
  if (schema.type === "object" || schema["ui:widget"] === "price") {
    if (value == null) {
      value = defaultValueForSchema(schema) ?? {};
    }
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) {
      value = defaultValueForSchema(schema) ?? [];
    }
  }
});

async function searchIcons(text: string) {
  text = text.toLowerCase().trim();
  if (!text) {
    return iconsList.slice(0, ICON_MAX_RESULTS);
  }
  return iconsList.filter((icon) => icon.includes(text)).slice(
    0,
    ICON_MAX_RESULTS,
  );
}
</script>

{#if deletable}
  <IconButton ariaLabel="Delete entry" variant="danger"
  onclick={() => deletable?.()}>
  <i class="fas fa-circle-minus"></i>
</IconButton>
{/if}

{#if schema["ui:widget"] == "hidden"}
  <div></div>
{:else if schema["ui:widget"] == "password"}
  <div class="col-span-full min-w-0">
  <FormField id={fieldId} label={title} description={schema.description}
    {required}>
      {#snippet children()}
        <Input
          id={fieldId}
          type="password"
          bind:value={rawValue}
          {disabled}
          {required}
          onchange={async () => {
            if (rawValue?.trim()) {
              value = await sha256Hex(rawValue);
            } else {
              value = "";
            }
          }}
        />
      {/snippet}
    </FormField>
</div>
{:else if schema["ui:widget"] == "icon"}
  <div class="min-w-0">
  <FormField id={fieldId} label={title} description={schema.description}
    {required}>
      {#snippet children()}
        <Select
          bind:justValue={value}
          class="icon-select"
          {value}
          showChevron={true}
          loadOptions={searchIcons}
          searchable={true}
          clearable={!required}
        >
          <div class="custom-icon" slot="selection" let:selection>
            <span>{iconGlyph(selection.value)} {selection.value}</span>
          </div>
          <div class="custom-icon" slot="item" let:item>
            <span class="name">{iconGlyph(item.value)} {item.value}</span>
          </div>
        </Select>
      {/snippet}
    </FormField>
</div>
{:else if schema["ui:widget"] == "boolean"}
  <div class="min-w-0">
  <FormField id={fieldId} label={title} description={schema.description}
    {required}>
      {#snippet children()}
        <div class="flex flex-wrap gap-4">
          <label class="inline-flex items-center gap-2 text-sm text-[var(--paisa-foreground)]">
            <input value="yes" bind:group={value} type="radio" name={radioName} {disabled} />
            Yes
          </label>
          <label class="inline-flex items-center gap-2 text-sm text-[var(--paisa-foreground)]">
            <input value="no" bind:group={value} type="radio" name={radioName} {disabled} />
            No
          </label>
        </div>
      {/snippet}
    </FormField>
</div>
{:else if schema.type === "string" || isEqual(schema.type, ["string", "integer"])}
  <div
  class="min-w-0 {schema.enum && schema['ui:widget'] !== 'textarea' ? '' : 'col-span-full'}"
>
  <FormField id={fieldId} label={title} description={schema.description}
    {required}>
      {#snippet children()}
        {#if schema.enum}
          <UiSelect bind:value {disabled} {required} fullwidth>
            {#each schema.enum as option}
              <option value={option}>{option}</option>
            {/each}
          </UiSelect>
        {:else if schema["ui:widget"] == "textarea"}
          <textarea
            id={fieldId}
            bind:value
            rows={5}
            {disabled}
            {required}
            class="paisa4-control paisa4-textarea"
            spellcheck="false"
            data-enable-grammarly="false"
          ></textarea>
        {:else}
          <input
            id={fieldId}
            {disabled}
            {required}
            pattern={schema.pattern}
            class="paisa4-control h-9 px-3"
            type="text"
            bind:value
          />
        {/if}
      {/snippet}
    </FormField>
</div>
{:else if schema.type === "integer" || schema.type === "number"}
  <div class="min-w-0">
  <FormField id={fieldId} label={title} description={schema.description}
    {required}>
      {#snippet children()}
        <input
          id={fieldId}
          {required}
          class="paisa4-control h-9 px-3"
          type="number"
          min={schema.minimum}
          max={schema.maximum}
          step={schema.type == "integer" ? 1 : 0.01}
          bind:value
        />
      {/snippet}
    </FormField>
</div>
{:else if schema["ui:widget"] == "accounts"}
  <div class="col-span-full min-w-0">
  <FormField id={fieldId} label={title} description={schema.description}
    {required}>
      {#snippet children()}
        <AccountSelect {allAccounts} bind:accounts={value} />
      {/snippet}
    </FormField>
</div>
{:else if schema["ui:widget"] == "price"}
  <div class="col-span-full flex min-w-0 flex-col gap-[var(--paisa-space-3)]">
  <div
    class="flex items-center justify-between text-sm font-medium text-[var(--paisa-text-secondary)]"
  >
    <span>{title}</span>
    <IconButton ariaLabel="Edit price code" onclick={() => (modalOpen = true)}>
      <i class="fas fa-pen-to-square"></i>
    </IconButton>
  </div>
  <PriceCodeSearchModal
    bind:open={modalOpen}
    on:select={(e) => {
        value["code"] = e.detail.code;
        value["provider"] = e.detail.provider;
      }}
  />
  <div
    class="grid grid-cols-1 gap-x-[var(--paisa-space-5)] gap-y-[var(--paisa-space-4)] md:grid-cols-2"
  >
      {#each sortedProperties(schema) as [childKey, subSchema]}
        <JsonSchemaForm
          {allAccounts}
          required={(schema.required || []).includes(childKey)}
          depth={depth + 1}
          key={childKey}
          bind:value={value[childKey]}
          schema={subSchema}
          disabled={true}
          variant="item"
        />
      {/each}
    </div>
</div>
{:else if schema.type == "object"}
  {#if variant === "panel" || variant === "item"}
    <div
  class="grid grid-cols-1 gap-x-[var(--paisa-space-5)] gap-y-[var(--paisa-space-4)] md:grid-cols-2"
>
      {#each sortedProperties(schema) as [childKey, subSchema]}
        {#if subSchema["ui:widget"] !== "hidden"}
          <JsonSchemaForm
            {allAccounts}
            required={(schema.required || []).includes(childKey)}
            depth={depth + 1}
            key={childKey}
            bind:value={value[childKey]}
            schema={subSchema}
            variant={isCompoundSchema(subSchema) ? "panel" : "item"}
          />
        {/if}
      {/each}
    </div>
  {:else}
    <div
  class="overflow-hidden rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)]"
>
      <div class="flex items-center">
        <button
          type="button"
          class="paisa4-trigger-reset flex min-h-10 w-full items-center justify-between px-3 text-left text-sm font-semibold text-[var(--paisa-text-primary)]"
          onclick={() => (open = !open)}
          aria-expanded={open}
        >
          <span>{itemTitle}</span>
          <i class="fas {open ? 'fa-angle-up' : 'fa-angle-down'} text-xs" aria-hidden="true"></i>
        </button>
      </div>
      {#if open}
        <div
          class="grid grid-cols-1 gap-x-[var(--paisa-space-5)] gap-y-[var(--paisa-space-4)] border-t border-[var(--paisa-border-subtle)] p-[var(--paisa-space-4)] md:grid-cols-2"
        >
          {#each sortedProperties(schema) as [childKey, subSchema]}
            <JsonSchemaForm
              {allAccounts}
              required={(schema.required || []).includes(childKey)}
              depth={depth + 1}
              key={childKey}
              bind:value={value[childKey]}
              schema={subSchema}
            />
          {/each}
        </div>
      {/if}
    </div>
  {/if}
{:else if schema.type == "array"}
  {@const items = Array.isArray(value) ? value : []}
  <div class="col-span-full flex min-w-0 flex-col gap-[var(--paisa-space-3)]">
    <div class="flex items-center gap-[var(--paisa-space-2)]">
      {#if title && !(variant === "panel" && depth === 0)}
        <span class="mr-auto text-sm font-semibold text-[var(--paisa-text-primary)]">{title}</span>
      {/if}
      <span class="ml-auto text-xs text-[var(--paisa-text-muted)]">
        {items.length}
        {items.length === 1 ? "item" : "items"}
      </span>
      <button
        type="button"
        class="inline-flex h-7 items-center gap-[var(--paisa-space-1)] rounded-[var(--paisa-radius-sm)] border-0 bg-transparent px-[var(--paisa-space-2)] text-sm font-medium text-[var(--paisa-brand-primary)] hover:bg-[var(--paisa-surface-hover)]"
        onclick={() => (value = [newItem(schema), ...items])}
      >
        <i class="fas fa-plus text-xs" aria-hidden="true"></i>
        <span>Add</span>
      </button>
    </div>
    {#if items.length === 0}
      <p
        class="m-0 rounded-[var(--paisa-radius-md)] border border-dashed border-[var(--paisa-border-default)] p-[var(--paisa-space-5)] text-center text-sm text-[var(--paisa-text-muted)]"
      >
        Nothing here yet. Add one to get started.
      </p>
    {:else}
      {#each items as _item, i}
        {#if schema.items && typeof schema.items === "object" && !Array.isArray(schema.items)}
          <article
            class="rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-muted)] p-[var(--paisa-space-4)]"
          >
            <header
              class="mb-[var(--paisa-space-4)] flex items-center gap-[var(--paisa-space-2)]"
            >
              <span class="mr-auto text-sm font-semibold text-[var(--paisa-text-primary)]">
                {(schema.items as Schema)["ui:header"] &&
                items[i][(schema.items as Schema)["ui:header"]!]
                  ? items[i][(schema.items as Schema)["ui:header"]!]
                  : `${title || "Item"} ${i + 1}`}
              </span>
              <IconButton
                ariaLabel="Delete item"
                variant="danger"
                onclick={() => {
                  const next = [...items];
                  next.splice(i, 1);
                  value = next;
                }}
              >
                <i class="fas fa-trash-can"></i>
              </IconButton>
            </header>
            <JsonSchemaForm
              {allAccounts}
              depth={depth + 1}
              key=""
              bind:value={value[i]}
              schema={schema.items as Schema}
              variant="item"
            />
          </article>
        {/if}
      {/each}
    {/if}
  </div>
{:else}
  <div>{JSON.stringify(schema)}</div>
{/if}
