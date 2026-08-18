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

<Page width="standard" loading={!loaded} loadingMessage="Loading configuration…">
  <div class="paisa-settings">
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
      <div class="paisa-settings-shell">
        <nav class="paisa-settings-nav" aria-label="Configuration sections">
          {#each sections as section}
            <button
              type="button"
              class="paisa-settings-nav-item"
              class:is-active={section.id === activeSection.id}
              onclick={() => (activeId = section.id)}
            >
              <span class="icon is-small">
                <i class="fas {section.icon}"></i>
              </span>
              <span>{section.label}</span>
            </button>
          {/each}
        </nav>

        <div class="paisa-settings-main">
          <div class="paisa-settings-panel">
            <div class="paisa-settings-panel-head">
              <div>
                <h2 class="paisa-settings-title">{activeSection.label}</h2>
                {#if activeSection.description}
                  <p class="paisa-settings-copy">{activeSection.description}</p>
                {/if}
              </div>
              {#if sectionCount != null}
                <Badge variant="neutral" size="sm">{sectionCount}</Badge>
              {/if}
            </div>

            {#if error}
              <article class="message is-danger paisa-settings-error">
                <div class="message-body">{error}</div>
              </article>
            {/if}

            <div class="paisa-settings-body">
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

          <div class="paisa-settings-bar">
            <Button variant="ghost" onclick={() => resetToDefault()}>
              Reset to defaults
            </Button>
            <div class="paisa-settings-bar-actions">
              <Button variant="outline" disabled={!hasChanges} onclick={discard}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isLoading}
                disabled={!hasChanges}
                onclick={() => save(config)}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</Page>

<style lang="scss">
  .paisa-settings {
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 6rem);
  }

  .paisa-settings-shell {
    display: grid;
    grid-template-columns: 13.5rem minmax(0, 1fr);
    gap: var(--paisa-space-5);
    align-items: start;
    flex: 1;
  }

  .paisa-settings-nav {
    position: sticky;
    top: var(--paisa-space-4);
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding: var(--paisa-space-2);
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md);
    background: var(--paisa-surface-card);
  }

  .paisa-settings-nav-item {
    display: flex;
    align-items: center;
    gap: var(--paisa-space-2);
    width: 100%;
    border: 0;
    border-radius: var(--paisa-radius-sm);
    background: transparent;
    color: var(--paisa-text-secondary);
    font-size: var(--paisa-font-size-sm);
    font-weight: var(--paisa-font-weight-medium);
    text-align: left;
    padding: 0.45rem 0.65rem;
    cursor: pointer;

    &:hover {
      background: var(--paisa-surface-hover);
      color: var(--paisa-text-primary);
    }

    &.is-active {
      background: var(--paisa-brand-primary-light);
      color: var(--paisa-brand-primary);
    }
  }

  .paisa-settings-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 11rem);
    border: 1px solid var(--paisa-border-subtle);
    border-radius: var(--paisa-radius-md);
    background: var(--paisa-surface-card);
    overflow: hidden;
  }

  .paisa-settings-panel {
    flex: 1;
    min-width: 0;
    padding: var(--paisa-space-5);
  }

  .paisa-settings-panel-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--paisa-space-3);
    margin-bottom: var(--paisa-space-5);
  }

  .paisa-settings-title {
    margin: 0;
    font-size: var(--paisa-font-size-lg);
    font-weight: var(--paisa-font-weight-semibold);
    color: var(--paisa-text-primary);
    line-height: var(--paisa-line-height-tight);
  }

  .paisa-settings-copy {
    margin: var(--paisa-space-1) 0 0;
    font-size: var(--paisa-font-size-sm);
    color: var(--paisa-text-secondary);
  }

  .paisa-settings-error {
    margin-bottom: var(--paisa-space-4);

    :global(.message-body) {
      white-space: pre-wrap;
      overflow: auto;
      font-size: var(--paisa-font-size-sm);
    }
  }

  .paisa-settings-bar {
    position: sticky;
    bottom: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--paisa-space-3);
    flex-wrap: wrap;
    padding: var(--paisa-space-3) var(--paisa-space-5);
    border-top: 1px solid var(--paisa-border-subtle);
    background: var(--paisa-surface-card);
  }

  .paisa-settings-bar-actions {
    display: flex;
    gap: var(--paisa-space-2);
    margin-left: auto;
  }

  @media screen and (max-width: 900px) {
    .paisa-settings-shell {
      grid-template-columns: 1fr;
    }

    .paisa-settings-nav {
      position: static;
      flex-direction: row;
      flex-wrap: wrap;
    }

    .paisa-settings-nav-item {
      width: auto;
    }
  }
</style>
