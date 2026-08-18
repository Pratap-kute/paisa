<script lang="ts">
  import JsonSchemaForm from "./JsonSchemaForm.svelte";
  import { sha256Hex } from "$lib/core/crypto";
  import type { JSONSchema7, JSONSchema7Definition } from "json-schema";
  import Select from "svelte-select";
  import _ from "lodash";
  import PriceCodeSearchModal from "./PriceCodeSearchModal.svelte";
  import { iconGlyph, iconsList } from "$lib/core/icon";
  import AccountSelect from "./AccountsSelect.svelte";
  import { untrack } from "svelte";

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
  let open = $state(untrack(() => variant === "panel" || variant === "item"));
  let title = $derived(_.startCase(key));
  let itemTitle = $derived(
    schema["ui:header"] && value && value[schema["ui:header"]]
      ? String(value[schema["ui:header"]])
      : title || "Item",
  );

  function newItem(listSchema: any) {
    if (listSchema.default?.[0] != null) {
      return _.cloneDeep(listSchema.default[0]);
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
    return _.sortBy(entries, ([key, subSchema]) => {
      return [
        subSchema["ui:order"] || 999,
        _.includes(schema.required || [], key) ? 0 : 1,
        subSchema.type == "object" ? 2 : subSchema.type == "array" ? 3 : 1,
        key
      ];
    });
  }

  function documentation(schema: Schema) {
    if (schema.description) {
      return `<p style="max-width: 300px">${schema.description}</p>`;
    }
    return null;
  }

  function defaultValueForSchema(s: Schema) {
    if (s.default !== undefined) {
      return _.cloneDeep(s.default);
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
    text = text.toLowerCase();
    if (_.isEmpty(text)) {
      return _.take(iconsList, ICON_MAX_RESULTS);
    }
    return _.take(
      iconsList.filter((icon) => icon.includes(text)),
      ICON_MAX_RESULTS
    );
  }
</script>

{#if deletable}
  <button
    type="button"
    aria-label="Delete entry"
    onclick={() => deletable?.()}
    class="config-delete"
  >
    <span class="icon is-small">
      <i class="fas fa-circle-minus"></i>
    </span>
  </button>
{/if}

{#if schema["ui:widget"] == "hidden"}
  <div></div>
{:else if schema["ui:widget"] == "password"}
  <div class="field is-horizontal config-field config-field-full">
    <div class="field-label is-small">
      <label data-tippy-content={documentation(schema)} for="" class="label">{title}</label>
    </div>
    <div class="field-body">
      <div class="field">
        <div class="control">
          <input
            {disabled}
            {required}
            class="input is-small"
            type="password"
            bind:value={rawValue}
            onchange={async () => {
              if (!_.isEmpty(rawValue)) {
                const inner = await sha256Hex(rawValue);
                value = "sha256:" + await sha256Hex(inner);
              }
            }}
          />
        </div>
      </div>
    </div>
  </div>
{:else if schema["ui:widget"] == "icon"}
  <div class="field is-horizontal config-field">
    <div class="field-label is-small">
      <label for="" data-tippy-content={documentation(schema)} class="label">{title}</label>
    </div>
    <div class="field-body">
      <div class="field">
        <div class="control">
          <Select
            bind:justValue={value}
            class="icon-select is-small"
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
        </div>
      </div>
    </div>
  </div>
{:else if schema["ui:widget"] == "boolean"}
  <div class="field is-horizontal config-field">
    <div class="field-label is-small">
      <label for="" data-tippy-content={documentation(schema)} class="label">{title}</label>
    </div>
    <div class="field-body">
      <div class="field">
        <div class="control">
          <label class="radio">
            <input value="yes" bind:group={value} type="radio" name={radioName} />
            Yes
          </label>
          <label class="radio">
            <input value="no" bind:group={value} type="radio" name={radioName} />
            No
          </label>
        </div>
      </div>
    </div>
  </div>
{:else if schema.type === "string" || _.isEqual(schema.type, ["string", "integer"])}
  <div class="field is-horizontal config-field {schema.enum && schema['ui:widget'] !== 'textarea' ? '' : 'config-field-full'}">
    <div class="field-label is-small">
      <label data-tippy-content={documentation(schema)} for="" class="label">{title}</label>
    </div>
    <div class="field-body">
      <div class="field">
        <div class="control">
          {#if schema.enum}
            <div class="select is-small">
              <select {disabled} bind:value {required}>
                {#each schema.enum as option}
                  <option value={option}>{option}</option>
                {/each}
              </select>
            </div>
          {:else if schema["ui:widget"] == "textarea"}
            <textarea
              {disabled}
              {required}
              class="textarea is-small"
              rows="5"
              bind:value
              spellcheck="false"
              data-enable-grammarly="false"></textarea>
          {:else}
            <input
              {disabled}
              {required}
              pattern={schema.pattern}
              class="input is-small"
              type="text"
              bind:value
            />
          {/if}
        </div>
      </div>
    </div>
  </div>
{:else if schema.type === "integer" || schema.type === "number"}
  <div class="field is-horizontal config-field">
    <div class="field-label is-small">
      <label for="" data-tippy-content={documentation(schema)} class="label">{title}</label>
    </div>
    <div class="field-body">
      <div class="field">
        <div class="control">
          <input
            {required}
            class="input is-small"
            type="number"
            min={schema.minimum}
            max={schema.maximum}
            step={schema.type == "integer" ? 1 : 0.01}
            bind:value
          />
        </div>
      </div>
    </div>
  </div>
{:else if schema["ui:widget"] == "accounts"}
  <div class="field is-horizontal config-field config-field-full">
    <div class="field-label is-small">
      <label for="" data-tippy-content={documentation(schema)} class="label">{title}</label>
    </div>
    <div class="field-body">
      <div class="field">
        <div class="control pr-5">
          <AccountSelect {allAccounts} bind:accounts={value} />
        </div>
      </div>
    </div>
  </div>
{:else if schema["ui:widget"] == "price"}
  <div class="config-price">
    <div class="config-price-header">
      <span>{title}</span>
      <button
        type="button"
        aria-label="Edit price code"
        onclick={() => (modalOpen = true)}
        class="config-add"
      >
        <span class="icon is-small">
          <i class="fas fa-pen-to-square"></i>
        </span>
      </button>
    </div>
    <PriceCodeSearchModal
      bind:open={modalOpen}
      on:select={(e) => {
        value["code"] = e.detail.code;
        value["provider"] = e.detail.provider;
      }}
    />
    <div class="config-fields">
      {#each sortedProperties(schema) as [childKey, subSchema]}
        <JsonSchemaForm
          {allAccounts}
          required={_.includes(schema.required || [], childKey)}
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
    <div class="config-fields">
      {#each sortedProperties(schema) as [childKey, subSchema]}
        {#if subSchema["ui:widget"] !== "hidden"}
          <JsonSchemaForm
            {allAccounts}
            required={_.includes(schema.required || [], childKey)}
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
    <div class="config-section">
      <div class="config-header">
        <button
          type="button"
          class="config-toggle"
          data-tippy-content={documentation(schema)}
          onclick={() => (open = !open)}
          aria-expanded={open}
        >
          <span>{itemTitle}</span>
          <span class="icon is-small">
            <i class="fas {open ? 'fa-angle-up' : 'fa-angle-down'}"></i>
          </span>
        </button>
      </div>
      {#if open}
        <div class="config-fields config-fields-padded">
          {#each sortedProperties(schema) as [childKey, subSchema]}
            <JsonSchemaForm
              {allAccounts}
              required={_.includes(schema.required || [], childKey)}
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
  <div class="config-list config-field-full">
    <div class="config-list-toolbar">
      {#if title && !(variant === "panel" && depth === 0)}
        <span class="config-list-title">{title}</span>
      {/if}
      <span class="config-list-count">
        {items.length}
        {items.length === 1 ? "item" : "items"}
      </span>
      <button
        type="button"
        class="config-add-label"
        onclick={() => (value = [newItem(schema), ...items])}
      >
        <span class="icon is-small"><i class="fas fa-plus"></i></span>
        <span>Add</span>
      </button>
    </div>
    {#if items.length === 0}
      <p class="config-empty">Nothing here yet. Add one to get started.</p>
    {:else}
      {#each items as _item, i}
        {#if schema.items && typeof schema.items === "object" && !Array.isArray(schema.items)}
          <article class="config-item">
            <header class="config-item-header">
              <span class="config-item-title">
                {(schema.items as Schema)["ui:header"] &&
                  items[i][(schema.items as Schema)["ui:header"]!]
                  ? items[i][(schema.items as Schema)["ui:header"]!]
                  : `${title || "Item"} ${i + 1}`}
              </span>
              <button
                type="button"
                aria-label="Delete item"
                class="config-delete"
                onclick={() => {
                  const next = [...items];
                  next.splice(i, 1);
                  value = next;
                }}
              >
                <span class="icon is-small"><i class="fas fa-trash-can"></i></span>
              </button>
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

<style lang="scss">
  .config-fields {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: var(--paisa-space-4) var(--paisa-space-5);
  }

  .config-fields-padded {
    padding: var(--paisa-space-4);
    border-top: 1px solid var(--paisa-border-subtle);
  }

  .config-field {
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    margin-bottom: 0;
  }

  .config-field-full {
    grid-column: 1 / -1;
  }

  .config-field :global(.field-label) {
    flex: none;
    text-align: left;
    padding-top: 0;
    margin-bottom: var(--paisa-space-1);
  }

  .config-field :global(.field-label .label) {
    font-size: var(--paisa-font-size-sm);
    font-weight: var(--paisa-font-weight-medium);
    color: var(--paisa-text-secondary);
  }

  .config-field :global(.field-body),
  .config-field :global(.control),
  .config-field :global(.input),
  .config-field :global(.textarea),
  .config-field :global(.select),
  .config-field :global(.select select) {
    width: 100%;
    max-width: none;
  }

  .config-section {
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md);
    overflow: hidden;
  }

  .config-header {
    display: flex;
    align-items: center;
  }

  .config-toggle {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-height: 2.5rem;
    padding: 0 var(--paisa-space-3);
    border: 0;
    background: transparent;
    color: var(--paisa-text-primary);
    font-size: var(--paisa-font-size-sm);
    font-weight: var(--paisa-font-weight-semibold);
    cursor: pointer;
    text-align: left;
  }

  .config-list {
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-3);
  }

  .config-list-toolbar {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-2);
  }

  .config-list-title {
    font-size: var(--paisa-font-size-sm);
    font-weight: var(--paisa-font-weight-semibold);
    color: var(--paisa-text-primary);
    margin-right: auto;
  }

  .config-list-count {
    font-size: var(--paisa-font-size-xs);
    color: var(--paisa-text-muted);
    margin-left: auto;
  }

  .config-add,
  .config-delete,
  .config-add-label {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--paisa-space-1);
    border: 0;
    border-radius: var(--paisa-radius-sm);
    background: transparent;
    color: var(--paisa-text-muted);
    cursor: pointer;
  }

  .config-add,
  .config-delete {
    width: 1.75rem;
    height: 1.75rem;
  }

  .config-add-label {
    height: 1.75rem;
    padding: 0 var(--paisa-space-2);
    font-size: var(--paisa-font-size-sm);
    color: var(--paisa-brand-primary);
    font-weight: var(--paisa-font-weight-medium);
  }

  .config-add:hover,
  .config-add-label:hover {
    background: var(--paisa-surface-hover);
    color: var(--paisa-brand-primary);
  }

  .config-delete:hover {
    background: var(--paisa-surface-hover);
    color: var(--paisa-danger);
  }

  .config-empty {
    margin: 0;
    padding: var(--paisa-space-5);
    text-align: center;
    color: var(--paisa-text-muted);
    font-size: var(--paisa-font-size-sm);
    border: 1px dashed var(--paisa-border-default);
    border-radius: var(--paisa-radius-md);
  }

  .config-item {
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md);
    background: var(--paisa-surface-muted);
    padding: var(--paisa-space-4);
  }

  .config-item-header {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-2);
    margin-bottom: var(--paisa-space-4);
  }

  .config-item-title {
    font-weight: var(--paisa-font-weight-semibold);
    font-size: var(--paisa-font-size-sm);
    color: var(--paisa-text-primary);
    margin-right: auto;
  }

  .config-price {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-3);
  }

  .config-price-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: var(--paisa-font-size-sm);
    font-weight: var(--paisa-font-weight-medium);
    color: var(--paisa-text-secondary);
  }

  @media screen and (max-width: 768px) {
    .config-fields {
      grid-template-columns: 1fr;
    }
  }
</style>
