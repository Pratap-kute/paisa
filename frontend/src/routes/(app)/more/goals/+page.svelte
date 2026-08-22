<script lang="ts">
  import { dndzone } from "svelte-dnd-action";
  import { flip } from "svelte/animate";
  import GoalSummaryCard from "$lib/components/finance/GoalSummaryCard.svelte";
  import ZeroState from "$lib/components/ui/ZeroState.svelte";
  import { ajax, helpUrl, type GoalSummary } from "$lib/core/utils";
  import _ from "lodash";
  import { onMount } from "svelte";
  import * as toast from "$lib/core/toast";
  import { writable } from "svelte/store";
  import type { Action } from "svelte/action";
  import Page from "$lib/components/layout/Page.svelte";
  import PageHeader from "$lib/components/layout/PageHeader.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  const goalDndzone = dndzone;

  let isEmpty = $state(false);
  let config: UserConfig;
  let goals: GoalSummary[] = $state([]);
  const dragDisabled = writable(true);

  function handleConsider(event: CustomEvent<DndEvent<GoalSummary>>) {
    goals = event.detail.items;
  }

  async function handleFinalize(event: CustomEvent<DndEvent<GoalSummary>>) {
    dragDisabled.set(true);

    goals = event.detail.items;
    for (let i = 0; i < goals.length; i++) {
      const g = goals[i];
      g.priority = goals.length - i;
      const goalConfig = _.find(config.goals[g.type] || [], { name: g.name });
      if (goalConfig) {
        goalConfig.priority = g.priority;
      }
    }
    await save(config);
  }

  async function save(newConfig: UserConfig) {
    const { success, error } = await ajax("/api/config", {
      method: "POST",
      body: JSON.stringify(newConfig),
      background: true
    });

    if (success) {
      globalThis.USER_CONFIG = _.cloneDeep(newConfig);
      toast.toast({
        message: `Updated goal config`,
        type: "is-success"
      });
    } else {
      toast.toast({
        message: `Failed to save config: ${error}`,
        type: "is-danger",
        duration: 10000
      });
    }
  }

  onMount(async () => {
    ({ config } = await ajax("/api/config"));
    ({ goals } = await ajax("/api/goals"));
    goals = _.sortBy(goals, (g) => -g.priority);
    if (_.isEmpty(goals)) {
      isEmpty = true;
    }
  });

  const dragHandle: Action<HTMLElement, {}> = (node: HTMLElement) => {
    function startDrag(e: Event) {
      e.preventDefault();
      dragDisabled.set(false);
    }

    function stopDrag(_e: KeyboardEvent) {
      dragDisabled.set(true);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        dragDisabled.set(false);
      }
    }

    dragDisabled.subscribe((disabled) => {
      node.tabIndex = disabled ? 0 : -1;
      node.style.cursor = disabled ? "grab" : "grabbing";
    });

    node.addEventListener("mousedown", startDrag);
    node.addEventListener("touchstart", startDrag);
    node.addEventListener("keydown", handleKeyDown);
    node.addEventListener("mouseup", stopDrag);
    node.addEventListener("touchend", stopDrag);

    return {
      update: () => {},
      destroy: () => {
        node.removeEventListener("mousedown", startDrag);
        node.removeEventListener("touchstart", startDrag);
        node.removeEventListener("keydown", handleKeyDown);
        node.removeEventListener("mouseup", stopDrag);
        node.removeEventListener("touchend", stopDrag);
      }
    };
  };
</script>

<svelte:head>
  <title>Financial Goals - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="Financial Goals"
    description="Prioritize and track progress towards retirement, savings, and custom targets"
  />

  <Section>
    {#if isEmpty}
      <ZeroState item={false}>
        <p class="text-sm text-[var(--paisa-muted-foreground)]">
          <strong class="text-[var(--paisa-foreground)]">Oops!</strong> You haven't configured any goals yet. Checkout the
          <a href={helpUrl("goals")} class="text-[var(--paisa-primary)] underline">docs</a> page to get started.
        </p>
      </ZeroState>
    {:else}
      <div
        class="grid w-full gap-4 grid-cols-1 min-[769px]:grid-cols-2 min-[1024px]:grid-cols-3 min-[1440px]:grid-cols-4"
        use:goalDndzone={{
          items: goals,
          dropTargetStyle: {},
          flipDurationMs: 300,
          dragDisabled: $dragDisabled
        }}
        onconsider={handleConsider}
        onfinalize={handleFinalize}
      >
        {#each goals as goal (goal.id)}
          <div animate:flip={{ duration: 300 }} class="min-w-0">
            <GoalSummaryCard action={dragHandle} {goal} />
          </div>
        {/each}
      </div>
    {/if}
  </Section>
</Page>
