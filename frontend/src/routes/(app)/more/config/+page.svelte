<script lang="ts">
  import { configUpdated } from "$lib/shared/browser/config";
  import { api } from "$lib/api";
  import { onMount } from "svelte";
  import type { JSONSchema7 } from "json-schema";
  import JsonSchemaForm from "$lib/features/ledger/components/JsonSchemaForm.svelte";
  import { cloneDeep, isEqual, startCase } from "es-toolkit";
  import * as toast from "$lib/shared/ui/toast";
  import { refresh } from "../../../../store";
  import { sync } from "$lib/api/sync";
  import Page from "$lib/shared/layout/Page.svelte";
  import PageHeader from "$lib/shared/layout/PageHeader.svelte";
  import Section from "$lib/shared/layout/Section.svelte";
  import Card from "$lib/shared/ui/Card.svelte";
  import Tabs from "$lib/shared/ui/Tabs.svelte";
  import Button from "$lib/shared/ui/Button.svelte";
  import Badge from "$lib/shared/ui/Badge.svelte";

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
      description: "Journal paths, locale, currency, and display formatting",
    },
    accounts: { icon: "fa-folder", description: "Account icons and labels" },
    allocation_targets: {
      icon: "fa-chart-pie",
      description: "Target mix for asset classes",
    },
    budget: { icon: "fa-wallet", description: "Budget rollover behaviour" },
    commodities: {
      icon: "fa-coins",
      description: "Mutual funds, stocks, and price providers",
    },
    credit_cards: {
      icon: "fa-credit-card",
      description: "Limits, due dates, and statement cycles",
    },
    goals: { icon: "fa-flag", description: "Retirement and savings targets" },
    import_templates: {
      icon: "fa-file-import",
      description: "Handlebars templates for statement import",
    },
    prediction: {
      icon: "fa-wand-magic-sparkles",
      description: "Merchant rules for import account prediction",
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
      const data = await api.config.getConfig();
      config = (data.config as unknown as Record<string, any>) || null;
      schema = (data.schema as unknown as Schema) || null;
      accounts = data.accounts || [];
      lastConfig = cloneDeep(config);
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
        label: startCase(key),
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

  function getSectionCount(sectionId: string): number | null {
    if (!config || sectionId === "general") return null;
    const section = sections.find((s) => s.id === sectionId);
    if (!section?.key) return null;
    const value = (config as Record<string, unknown>)[section.key];
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") {
      return (
        Object.values(value).reduce((sum: number, item) => {
          return sum + (Array.isArray(item) ? item.length : 0);
        }, 0) || null
      );
    }
    return null;
  }

  let sectionCount = $derived(getSectionCount(activeSection?.id || ""));

  let tabOptions = $derived(
    sections.map((sec) => {
      const count = getSectionCount(sec.id);
      return {
        label: sec.label,
        value: sec.id,
        icon: sec.icon,
        badge: count != null ? count : undefined,
      };
    }),
  );

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
      try {
        const res = await api.config.saveConfig(newConfig as unknown as string);
        success = res.success;
      } catch (err: unknown) {
        respError = err instanceof Error ? err.message : "Failed to save config";
      }
      error = respError;

      if (success) {
        lastConfig = cloneDeep(newConfig);
        config = cloneDeep(newConfig);
        globalThis.USER_CONFIG = cloneDeep(newConfig) as UserConfig;
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
    config = cloneDeep(lastConfig);
  }

  let hasChanges = $derived(!isEqual(config, lastConfig));

  function handleKeydown(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key === "s") {
      event.preventDefault();
      if (hasChanges && !isLoading) {
        save(config);
      }
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
  <title>Configuration - Paisa</title>
</svelte:head>

<Page width="analysis" loading={!loaded} loadingMessage="Loading configuration…">
  <PageHeader
    title="Configuration"
    description="Edit paisa.yaml by section. Save writes the configuration file and re-syncs your ledger."
    help="config"
  >
    {#snippet actions()}
      {#if hasChanges}
        <Badge variant="warning" size="sm" rounded dot>Unsaved changes</Badge>
      {/if}
    {/snippet}
  </PageHeader>

  <Section>
    {#if schema && config && activeSection && activeSchema}
      <div class="flex flex-col gap-4">
        <!-- Horizontal Section Navigation Tabs -->
        <nav class="w-full overflow-x-auto pb-1" aria-label="Configuration sections">
          <Tabs
            bind:value={activeId}
            options={tabOptions}
            variant="boxed"
            size="sm"
          />
        </nav>

        <!-- Full-Width Configuration Form Card -->
        <Card padding="none" class="w-full overflow-hidden">
          <!-- Section Title Bar -->
          <div class="border-b border-[var(--paisa-border-default)] bg-[var(--paisa-surface-2)] p-4 sm:p-5">
            <div class="flex items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--paisa-radius-md)] bg-[var(--paisa-surface-raised)] text-[var(--paisa-brand-primary)] shadow-sm">
                  <i class="fas {activeSection.icon} text-base"></i>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h2 class="m-0 text-base font-bold text-[var(--paisa-text-primary)]">
                      {activeSection.label}
                    </h2>
                    {#if sectionCount != null}
                      <Badge variant="neutral" size="sm" rounded>{sectionCount}</Badge>
                    {/if}
                  </div>
                  {#if activeSection.description}
                    <p class="mt-0.5 text-xs text-[var(--paisa-muted-foreground)]">
                      {activeSection.description}
                    </p>
                  {/if}
                </div>
              </div>
            </div>
          </div>

          <!-- Form Fields Content -->
          <div class="p-4 sm:p-6">
            {#if error}
              <div
                class="mb-4 rounded-[var(--paisa-radius-md)] border border-[var(--paisa-danger)]/20 bg-[var(--paisa-danger-light)] px-4 py-3 text-xs font-mono whitespace-pre-wrap text-[var(--paisa-danger)] shadow-sm"
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

          <!-- Sticky Action Bar -->
          <div
            class="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--paisa-border-default)] bg-[var(--paisa-surface-2)] px-4 py-3 sm:px-6"
          >
            <Button
              variant="ghost"
              size="sm"
              class="max-lg:w-full max-lg:justify-center text-xs"
              onclick={() => resetToDefault()}
            >
              <i class="fas fa-arrow-rotate-left mr-1"></i>
              Reset to defaults
            </Button>
            <div
              class="ml-auto flex gap-2 max-lg:ml-0 max-lg:w-full max-lg:flex-col"
            >
              <Button
                variant="outline"
                size="sm"
                disabled={!hasChanges}
                class="max-lg:w-full max-lg:justify-center"
                onclick={discard}
              >
                Discard
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={isLoading}
                disabled={!hasChanges}
                class="max-lg:w-full max-lg:justify-center"
                onclick={() => save(config)}
              >
                {#snippet icon()}
                  <i class="fas fa-floppy-disk"></i>
                {/snippet}
                Save Changes
              </Button>
            </div>
          </div>
        </Card>
      </div>
    {/if}
  </Section>
</Page>
