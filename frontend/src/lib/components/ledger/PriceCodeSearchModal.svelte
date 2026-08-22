<script lang="ts">
  import Select from "svelte-select";
  import Dialog from "$lib/components/ui/Dialog.svelte";
  import FormField from "$lib/components/layout/FormField.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import SelectField from "$lib/components/ui/Select.svelte";
  import _ from "lodash";
  import { createEventDispatcher, onMount } from "svelte";
  import { ajax, type AutoCompleteItem, type PriceProvider } from "$lib/core/utils";

  let label = "Choose Price Provider";
  interface Props {
    open?: boolean;
  }

  let { open = $bindable(false) }: Props = $props();
  let code = $state("");

  let providers: PriceProvider[] = $state([]);
  let selectedProvider: PriceProvider = $state(null);

  let filters: Record<string, AutoCompleteItem | string | null> = $state({});

  onMount(async () => {
    ({ providers } = await ajax("/api/price/providers", { background: true }));
    selectedProvider = providers[0];
  });

  let isLoading = $state(false);
  async function clearProviderCache() {
    isLoading = true;
    try {
      await ajax(
        "/api/price/providers/delete/:provider",
        { method: "POST", background: true },
        { provider: selectedProvider.code }
      );
    } finally {
      isLoading = false;
      reset();
    }
  }

  let autocompleteCache: number[] = $state([]);
  function clearCache(i: number) {
    autocompleteCache[i] = (autocompleteCache[i] || 0) + 1;
  }

  function reset() {
    code = "";
    filters = {};
    for (let i = 0; i < _.max(_.map(providers, (p) => p.fields.length)); i++) {
      clearCache(i);
    }
  }

  function makeAutoComplete(
    field: string,
    filters: Record<string, AutoCompleteItem | string | null>,
    i: number,
    provider: PriceProvider
  ) {
    return async function autocomplete(filterText: string): Promise<AutoCompleteItem[]> {
      for (let j = 0; j < i; j++) {
        if (_.isEmpty(filters[provider.fields[j].id])) {
          return [];
        }
      }

      const queryFilters = _.mapValues(filters, (v) => (_.isString(v) ? v : v?.id));
      queryFilters[field] = filterText;
      const { completions } = await ajax("/api/price/autocomplete", {
        method: "POST",
        body: JSON.stringify({
          field,
          provider: selectedProvider.code,
          filters: queryFilters
        }),
        background: true
      });
      return completions;
    };
  }

  const dispatch = createEventDispatcher();

  let providerOptions = $derived(
    providers.map((p) => ({ value: p.code, label: p.label }))
  );

  let selectedProviderCode = $derived(selectedProvider?.code ?? "");

  function handleProviderChange(e: Event & { currentTarget: HTMLSelectElement }) {
    const provider = providers.find((p) => p.code === e.currentTarget.value);
    if (provider) {
      selectedProvider = provider;
      reset();
    }
  }
</script>

<Dialog bind:open footerClass="flex justify-between items-center gap-2">
  {#snippet header({ close })}
    <div class="paisa4-dialog-header w-full">
      <p class="paisa4-dialog-title">{label}</p>
      <button type="button" class="paisa4-icon-action" aria-label="Close dialog" onclick={() => close()}>×</button>
    </div>
  {/snippet}
  {#snippet children()}
    <div style="min-height: 500px;">
      {#if selectedProvider}
        <FormField id="price-provider" label="Provider">
          {#snippet children()}
            <SelectField
              value={selectedProviderCode}
              options={providerOptions}
              size="md"
              fullwidth
              onchange={handleProviderChange}
            />
            {#if selectedProvider.description}
              <p class="mt-1 text-xs text-[var(--paisa-muted-foreground)]">{@html selectedProvider.description}</p>
            {/if}
          {/snippet}
        </FormField>
        <div class="mt-4">
          {#each selectedProvider.fields as field, i}
            <FormField id="price-field-{field.id}" label={field.label}>
              {#snippet children()}
                {#if field.inputType == "text"}
                  {#if i === selectedProvider.fields.length - 1}
                    <Input type="text" bind:value={code} size="md" required />
                  {:else}
                    <Input
                      type="text"
                      value={String(filters[field.id] ?? "")}
                      oninput={(e) => {
                        filters[field.id] = e.currentTarget.value;
                      }}
                      size="md"
                      required
                    />
                  {/if}
                {:else}
                  {#key autocompleteCache[i]}
                    <Select
                      bind:value={filters[field.id]}
                      --list-z-index="5"
                      showChevron={true}
                      loadOptions={makeAutoComplete(field.id, filters, i, selectedProvider)}
                      label="label"
                      itemId="id"
                      debounceWait={500}
                      searchable={true}
                      clearable={false}
                      on:change={() => {
                        _.each(selectedProvider.fields, (f, j) => {
                          if (j > i) {
                            clearCache(j);
                            filters[f.id] = null;
                          }
                        });

                        if (i === selectedProvider.fields.length - 1) {
                          const item = filters[field.id];
                          code = typeof item === "object" && item ? item.id : "";
                        } else {
                          code = "";
                        }
                      }}
                    ></Select>
                  {/key}
                {/if}
                {#if field.help}
                  <p class="mt-1 text-xs text-[var(--paisa-muted-foreground)]">{@html field.help}</p>
                {/if}
              {/snippet}
            </FormField>
          {/each}
        </div>
      {/if}
    </div>
  {/snippet}
  {#snippet footer({ close })}
    <div class="flex items-center gap-2">
      <Button
        variant="primary"
        size="md"
        disabled={_.isEmpty(code)}
        onclick={() => {
          dispatch("select", { code: code, provider: selectedProvider.code });
          reset();
          close();
        }}
      >
        Select
      </Button>
      <Button variant="ghost" size="md" onclick={() => close()}>Cancel</Button>
    </div>

    <div>
      <Button
        variant="danger"
        size="md"
        loading={isLoading}
        disabled={!selectedProvider}
        onclick={() => clearProviderCache()}
      >
        Clear Provider Cache
      </Button>
    </div>
  {/snippet}
</Dialog>
