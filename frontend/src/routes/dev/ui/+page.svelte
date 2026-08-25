<script lang="ts">
import Badge from "$lib/shared/ui/Badge.svelte";
import Button from "$lib/shared/ui/Button.svelte";
import Checkbox from "$lib/shared/ui/Checkbox.svelte";
import ChartFrame from "$lib/shared/ui/ChartFrame.svelte";
import Dialog from "$lib/shared/ui/Dialog.svelte";
import Drawer from "$lib/shared/ui/Drawer.svelte";
import Input from "$lib/shared/ui/Input.svelte";
import Popover from "$lib/shared/ui/Popover.svelte";
import Select from "$lib/shared/ui/Select.svelte";
import Skeleton from "$lib/shared/ui/Skeleton.svelte";
import Tabs from "$lib/shared/ui/Tabs.svelte";
import Textarea from "$lib/shared/ui/Textarea.svelte";
import DataToolbar from "$lib/shared/layout/DataToolbar.svelte";
import FilterBar from "$lib/shared/layout/FilterBar.svelte";
import FormField from "$lib/shared/layout/FormField.svelte";
import FormSection from "$lib/shared/layout/FormSection.svelte";
import Metric from "$lib/shared/layout/Metric.svelte";
import MetricStrip from "$lib/shared/layout/MetricStrip.svelte";
import StatusBar from "$lib/shared/layout/StatusBar.svelte";
import WorkspacePane from "$lib/shared/layout/WorkspacePane.svelte";

let tab = $state("overview");
let checked = $state(true);
let selectValue = $state("monthly");
let name = $state(
  "Amazon India Marketplace Services Private Limited - Home Improvement Order",
);
let notes = $state("Statement row has missing secondary metadata.");
let darkPreview = $state(false);

const longAccount =
  "Expenses:Housing:HomeImprovement:InteriorDecoration:LivingRoom";
const amounts = [
  "₹0.00",
  "₹1,249.00",
  "-₹1,249.00",
  "₹82,40,500.00",
  "₹1,85,42,000.00",
  "11.8%",
  "-4.2%",
];
</script>

<svelte:head>
  <title>Paisa UI Lab</title>
</svelte:head>

<main
  class="min-h-screen overflow-x-hidden bg-canvas p-4 font-sans text-foreground md:p-8">
  <div class="mx-auto flex max-w-[1440px] flex-col gap-8">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="paisa-type-caption text-muted-foreground">Development</p>
        <h1 class="paisa-type-page-title m-0">Paisa UI Lab</h1>
        <p class="m-0 mt-1 max-w-3xl text-sm text-muted-foreground">
          Phase 4 foundation workbench. Production routes do not import this route.
        </p>
      </div>
      <label class="flex min-h-11 items-center gap-2 text-sm">
        <input type="checkbox" bind:checked={darkPreview} />
        Dark preview
      </label>
    </header>

    <section class="grid gap-4 rounded-lg border border-border bg-surface p-4"
      data-theme={darkPreview ? "dark" : undefined}>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 class="paisa-type-section-heading m-0">Foundation</h2>
        <div class="flex flex-wrap gap-2">
          <Badge variant="neutral">neutral</Badge>
          <Badge variant="success">positive</Badge>
          <Badge variant="danger">negative</Badge>
          <Badge variant="warning">warning</Badge>
        </div>
      </div>
      <div class="grid gap-3 md:grid-cols-4">
        <div class="rounded-md border border-border bg-canvas p-3">Canvas</div>
        <div
          class="rounded-md border border-border bg-surface p-3">Surface</div>
        <div
          class="rounded-md border border-border bg-surface-raised p-3">Raised</div>
        <div
          class="rounded-md border border-border bg-surface-hover p-3">Hover</div>
      </div>
      <div class="grid gap-2">
        {#each amounts as amount}
          <div class="paisa-financial-number text-foreground">{amount}</div>
        {/each}
      </div>
    </section>

    <section class="grid gap-4">
      <h2 class="paisa-type-section-heading m-0">Controls</h2>
      <div
        class="grid gap-4 rounded-lg border border-border bg-surface p-4 lg:grid-cols-2">
        <div class="flex flex-wrap gap-2">
          <Button variant="primary">Primary</Button>
          <Button>Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
        </div>
        <div class="grid gap-3">
          <Input bind:value={name} placeholder="Merchant" />
          <Textarea bind:value={notes} placeholder="Notes" />
          <Select bind:value={selectValue} options={[
            { value: "monthly", label: "Monthly" },
            { value: "yearly", label: "Yearly" },
          ]} />
          <Checkbox bind:checked label="Reviewed transaction" />
        </div>
      </div>
    </section>

    <section class="grid gap-4">
      <h2 class="paisa-type-section-heading m-0">Financial Display</h2>
      <div class="rounded-lg border border-border bg-surface p-4">
        <MetricStrip cols={4}>
          <Metric label="Net worth" value="₹1,85,42,000.00"
            secondary="All accounts" status="neutral" />
          <Metric label="Gain" value="₹82,40,500.00" trend="11.8%"
            status="positive" />
          <Metric label="Drawdown" value="-₹1,249.00" trend="-4.2%"
            status="negative" />
          <Metric label="Sync" value="Partial" secondary="2 stale prices"
            status="warning" />
        </MetricStrip>
      </div>
    </section>

    <section class="grid gap-4">
      <h2 class="paisa-type-section-heading m-0">Feedback & States</h2>
      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-lg border border-border bg-surface p-4">
          <Skeleton height="2rem" />
          <div class="mt-3 grid gap-2">
            <Skeleton />
            <Skeleton width="72%" />
          </div>
        </div>
        <div class="rounded-lg border border-border bg-surface p-4">
          <p class="m-0 font-semibold">Empty</p>
          <p
            class="m-0 mt-1 text-sm text-muted-foreground">No transactions match this filter.</p>
        </div>
        <div class="rounded-lg border border-border bg-surface p-4">
          <p class="m-0 font-semibold text-negative">Error</p>
          <p
            class="m-0 mt-1 text-sm text-muted-foreground">Price sync failed; ledger data is still available.</p>
        </div>
      </div>
    </section>

    <section class="grid gap-4">
      <h2 class="paisa-type-section-heading m-0">Overlays</h2>
      <div class="flex flex-wrap gap-2">
        <Dialog title="Reconcile transaction"
          description="Focus is trapped and Escape closes the dialog.">
          {#snippet trigger()}<span class="paisa4-button paisa4-button-primary">Open dialog</span>{/snippet}
          {#snippet children({ close })}
            <p class="m-0 text-sm">Merchant: {name}</p>
            <button class="paisa4-button mt-4" onclick={close}>Done</button>
          {/snippet}
        </Dialog>
        <Drawer title="Filters" description="Narrow-width sheet behavior.">
          {#snippet trigger()}<span class="paisa4-button">Open drawer</span>{/snippet}
          {#snippet children()}
            <FilterBar>
              <button class="paisa4-button">Cleared</button>
              <button class="paisa4-button">Uncategorized</button>
              <button class="paisa4-button">Warnings</button>
            </FilterBar>
          {/snippet}
        </Drawer>
        <Popover>
          {#snippet trigger()}<span class="paisa4-button">Open popover</span>{/snippet}
          {#snippet children({ close })}
            <p class="m-0 text-sm">Popover content stays token-driven.</p>
            <button class="paisa4-button paisa4-button-ghost mt-3" onclick={close}>Close</button>
          {/snippet}
        </Popover>
      </div>
      <Tabs bind:value={tab} options={[
        { label: "Overview", value: "overview" },
        { label: "Details", value: "details" },
        { label: "Disabled", value: "disabled", disabled: true },
      ]} />
    </section>

    <section class="grid gap-4">
      <h2 class="paisa-type-section-heading m-0">Layout, Data & Workspace</h2>
      <WorkspacePane title="Import workspace">
        <DataToolbar label="Transactions" count="420 records">
          {#snippet search()}<Input placeholder="Search payee, account, commodity..." />{/snippet}
          {#snippet filters()}<FilterBar><button class="paisa4-button">Matched</button><button class="paisa4-button">Needs review</button></FilterBar>{/snippet}
          {#snippet actions()}<button class="paisa4-button paisa4-button-primary">Export</button>{/snippet}
        </DataToolbar>
        <div class="mt-4 grid gap-3">
          <div class="grid gap-1 rounded-md border border-border p-3">
            <div class="flex min-w-0 justify-between gap-3">
              <span class="truncate">{name}</span>
              <span
                class="paisa-financial-number text-negative">-₹1,249.00</span>
            </div>
            <span
              class="break-words text-sm text-muted-foreground">{longAccount}</span>
          </div>
          <ChartFrame title="ChartFrame placeholder" height="compact">
            <div
              class="flex h-48 items-center justify-center rounded-md border border-border-subtle text-sm text-muted-foreground">
              Stable chart geometry
            </div>
          </ChartFrame>
        </div>
      </WorkspacePane>
      <FormSection title="Form foundation"
        description="Field labels, descriptions, and errors are associated.">
        <FormField id="merchant" label="Merchant"
          description="Shown on transaction rows" required>
          {#snippet children({ describedby, invalid, disabled })}
            <Input id="merchant" bind:value={name} {disabled} />
            <span class="sr-only">{describedby}{invalid}</span>
          {/snippet}
        </FormField>
        <FormField id="account" label="Account"
          error="Choose a posting account before saving.">
          {#snippet children({ describedby, invalid })}
            <Textarea id="account" value={longAccount} {describedby} {invalid} />
          {/snippet}
        </FormField>
      </FormSection>
      <StatusBar>
        {#snippet left()}390px and desktop checks should have no horizontal overflow.{/snippet}
        {#snippet right()}Ready{/snippet}
      </StatusBar>
    </section>
  </div>
</main>
