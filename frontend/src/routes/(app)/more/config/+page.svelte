<script lang="ts">
  import { ajax, configUpdated } from "$lib/core/utils";
  import { onMount } from "svelte";
  import type { JSONSchema7 } from "json-schema";
  import JsonSchemaForm from "$lib/components/ledger/JsonSchemaForm.svelte";
  import _ from "lodash";
  import * as toast from "$lib/core/toast";
  import { refresh } from "../../../../store";
  import { sync } from "$lib/api/sync";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";

  interface Schema extends JSONSchema7 {
    "ui:widget"?: string;
  }

  interface ConfigSection {
    id: string;
    label: string;
    description: string;
    icon: string;
    kind: "general" | "key";
    key?: string;
  }

  const SECTION_META: Record<string, { icon: string; description: string }> = {
    general: {
      icon: "fa-sliders",
      description: "Journal paths, locale, currency, and display",
    },
    budget: { icon: "fa-wallet", description: "Budget rollover behaviour" },
    goals: { icon: "fa-flag", description: "Retirement and savings targets" },
    prediction: {
      icon: "fa-wand-magic-sparkles",
      description: "Merchant rules for import account prediction",
    },
    accounts: { icon: "fa-folder", description: "Account icons and labels" },
    allocation_targets: {
      icon: "fa-chart-pie",
      description: "Target mix for asset classes",
    },
    commodities: {
      icon: "fa-coins",
      description: "Mutual funds, stocks, and price providers",
    },
    credit_cards: {
      icon: "fa-credit-card",
      description: "Limits, due dates, and statement cycles",
    },
    import_templates: {
      icon: "fa-file-import",
      description: "Handlebars templates for statement import",
    },
    schedule_al: {
      icon: "fa-file-invoice",
      description: "Schedule AL grouping",
    },
    user_accounts: {
      icon: "fa-user-lock",
      description: "Web UI login accounts",
    },
  };

  let lastConfig = $state<Record<string, any> | null>(null);
  let config = $state<Record<string, any> | null>(null);
  let schema = $state<Schema | null>(null);
  let isLoading = $state(false);
  let error = $state<string | null>(null);
  let accounts = $state<string[]>([]);
  let loaded = $state(false);
  let activeId = $state("general");

  onMount(async () => {
    try {
      const data = await ajax("/api/config");
      config = data.config;
      schema = data.schema;
      accounts = data.accounts || [];
      lastConfig = _.cloneDeep(config);
    } finally {
      loaded = true;
    }
  });

  function isHidden(subSchema: Schema) {
    return subSchema["ui:widget"] === "hidden";
  }

  function isSection(subSchema: Schema) {
    return subSchema.type === "object" || subSchema.type === "array";
  }

  let sections = $derived.by((): ConfigSection[] => {
    if (!schema?.properties) return [];
    const entries = Object.entries(schema.properties) as [string, Schema][];
    const list: ConfigSection[] = [
      {
        id: "general",
        label: "General",
        kind: "general",
        icon: SECTION_META.general.icon,
        description: SECTION_META.general.description,
      },
    ];
    for (const [key, subSchema] of entries) {
      if (isHidden(subSchema) || !isSection(subSchema)) continue;
      const meta = SECTION_META[key] || {
        icon: "fa-gear",
        description: subSchema.description || "",
      };
      list.push({
        id: key,
        key,
        label: _.startCase(key),
        kind: "key",
        icon: meta.icon,
        description: meta.description,
      });
    }
    return list;
  });

  let generalSchema = $derived.by((): Schema | null => {
    if (!schema?.properties) return null;
    const properties: Record<string, Schema> = {};
    const required: string[] = [];
    for (const [key, subSchema] of Object.entries(schema.properties) as [string, Schema][]) {
      if (isHidden(subSchema) || isSection(subSchema)) continue;
      properties[key] = subSchema;
      if ((schema.required || []).includes(key)) required.push(key);
    }
    return { type: "object", properties, required };
  });

  let activeSection = $derived(sections.find((section) => section.id === activeId) || sections[0]);

  let activeSchema = $derived.by((): Schema | null => {
    if (!schema || !activeSection) return null;
    if (activeSection.kind === "general") return generalSchema;
    return (schema.properties?.[activeSection.key!] as Schema) || null;
  });

  let sectionCount = $derived.by(() => {
    if (!config || !activeSection || activeSection.kind === "general") return null;
    const value = (config as Record<string, unknown>)[activeSection.key!];
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") {
      return Object.values(value).reduce((sum: number, item) => {
        return sum + (Array.isArray(item) ? item.length : 0);
      }, 0) || null;
    }
    return null;
  });

  async function resetToDefault() {
    if (
      !confirm(
        "Are you sure you want to reset the config to defaults? This action is not reversible.",
      )
    ) {
      return;
    }
    if (lastConfig) {
      save({
        journal_path: lastConfig.journal_path,
        db_path: lastConfig.db_path,
      });
    }
  }

  async function save(newConfig: Record<string, any> | null) {
    if (!newConfig) return;
    isLoading = true;
    try {
      let success = false;
      let respError: string | null = null;
      ({ success, error: respError } = await ajax("/api/config", {
        method: "POST",
        body: JSON.stringify(newConfig),
        background: true,
      }));
      error = respError;

      if (success) {
        lastConfig = _.cloneDeep(newConfig);
        config = _.cloneDeep(newConfig);
        globalThis.USER_CONFIG = _.cloneDeep(newConfig) as UserConfig;
        configUpdated();
        refresh();
        toast.toast({
          message: `Saved config`,
          type: "is-success",
        });
        await sync({ journal: true });
      }
    } finally {
      isLoading = false;
    }
  }

  function discard() {
    config = _.cloneDeep(lastConfig);
  }

  let hasChanges = $derived(!_.isEqual(config, lastConfig));
</script>

<svelte:head>
  <title>Configuration - Paisa</title>
</svelte:head>

<Page width="standard" loading={!loaded} loadingMessage="Loading configuration…">
  <PageHeader
    title="Configuration"
    description="Edit paisa.yaml by section. Save writes the file and re-syncs the journal."
    help="config"
  >
    {#snippet actions()}
      {#if hasChanges}
        <Badge variant="warning" size="sm">Unsaved changes</Badge>
      {/if}
    {/snippet}
  </PageHeader>

  {#if schema && config && activeSection && activeSchema}
    <div class="flex min-h-[calc(100vh-6rem)] flex-col">
      <div
        class="flex flex-1 flex-col gap-[var(--paisa-space-5)] lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:items-start"
      >
        <div class="lg:hidden">
          <label
            class="mb-1 block text-sm font-medium text-[var(--paisa-text-secondary)]"
            for="config-section"
          >
            Section
          </label>
          <select
            id="config-section"
            class="paisa4-control h-9 px-3"
            bind:value={activeId}
          >
            {#each sections as section}
              <option value={section.id}>{section.label}</option>
            {/each}
          </select>
        </div>

        <nav
          class="sticky top-[var(--paisa-space-4)] hidden flex-col gap-0.5 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-card)] p-[var(--paisa-space-2)] lg:flex"
          aria-label="Configuration sections"
        >
          {#each sections as section}
            <button
              type="button"
              class="flex w-full items-center gap-[var(--paisa-space-2)] rounded-[var(--paisa-radius-sm)] border-0 bg-transparent px-[0.65rem] py-[0.45rem] text-left text-sm font-medium text-[var(--paisa-text-secondary)] hover:bg-[var(--paisa-surface-hover)] hover:text-[var(--paisa-text-primary)] {section.id === activeSection.id ? 'bg-[var(--paisa-brand-primary-light)] text-[var(--paisa-brand-primary)]' : ''}"
              onclick={() => (activeId = section.id)}
            >
              <i class="fas {section.icon} w-4 shrink-0 text-center text-xs" aria-hidden="true"></i>
              <span>{section.label}</span>
            </button>
          {/each}
        </nav>

        <div
          class="flex min-h-[calc(100vh-11rem)] min-w-0 flex-col overflow-hidden rounded-[var(--paisa-radius-md)] border border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-card)]"
        >
          <div class="min-w-0 flex-1 p-[var(--paisa-space-5)]">
            <div
              class="mb-[var(--paisa-space-5)] flex items-start justify-between gap-[var(--paisa-space-3)]"
            >
              <div>
                <h2
                  class="m-0 text-lg font-semibold leading-tight text-[var(--paisa-text-primary)]"
                >
                  {activeSection.label}
                </h2>
                {#if activeSection.description}
                  <p class="mt-[var(--paisa-space-1)] text-sm text-[var(--paisa-text-secondary)]">
                    {activeSection.description}
                  </p>
                {/if}
              </div>
              {#if sectionCount != null}
                <Badge variant="neutral" size="sm">{sectionCount}</Badge>
              {/if}
            </div>

            {#if error}
              <div
                class="mb-[var(--paisa-space-4)] rounded-[var(--paisa-radius-md)] border border-[var(--paisa-danger)]/20 bg-[var(--paisa-danger-light)] px-[var(--paisa-space-4)] py-[var(--paisa-space-3)] text-sm whitespace-pre-wrap text-[var(--paisa-danger)]"
                role="alert"
              >
                {error}
              </div>
            {/if}

            <div>
              {#key activeSection.id}
                {#if activeSection.kind === "general"}
                  <JsonSchemaForm
                    allAccounts={accounts}
                    key="general"
                    bind:value={config}
                    schema={activeSchema}
                    variant="panel"
                  />
                {:else}
                  <JsonSchemaForm
                    allAccounts={accounts}
                    key={activeSection.key!}
                    bind:value={config[activeSection.key!]}
                    schema={activeSchema}
                    variant="panel"
                  />
                {/if}
              {/key}
            </div>
          </div>

          <div
            class="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-[var(--paisa-space-3)] border-t border-[var(--paisa-border-subtle)] bg-[var(--paisa-surface-card)] px-[var(--paisa-space-5)] py-[var(--paisa-space-3)]"
          >
            <Button
              variant="ghost"
              class="max-lg:w-full max-lg:justify-center"
              onclick={() => resetToDefault()}
            >
              Reset to defaults
            </Button>
            <div
              class="ml-auto flex gap-[var(--paisa-space-2)] max-lg:ml-0 max-lg:w-full max-lg:flex-col"
            >
              <Button
                variant="outline"
                disabled={!hasChanges}
                class="max-lg:w-full max-lg:justify-center"
                onclick={discard}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isLoading}
                disabled={!hasChanges}
                class="max-lg:w-full max-lg:justify-center"
                onclick={() => save(config)}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</Page>
