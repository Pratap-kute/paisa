<script lang="ts">
  import type { GoalSummary } from "$lib/domain/goals_models";
import { dndzone } from "svelte-dnd-action";
  import { flip } from "svelte/animate";
  import GoalSummaryCard from "$lib/features/goals/components/GoalSummaryCard.svelte";
  import ZeroState from "$lib/shared/ui/ZeroState.svelte";
  import { helpUrl } from "$lib/shared/browser/navigation";
  import { api } from "$lib/api";
  import { cloneDeep } from "es-toolkit";
  import { onMount } from "svelte";
  import * as toast from "$lib/shared/ui/toast";
  import { writable } from "svelte/store";
  import type { Action } from "svelte/action";
  import Page from "$lib/shared/layout/Page.svelte";
  import PageHeader from "$lib/shared/layout/PageHeader.svelte";
  import Section from "$lib/shared/layout/Section.svelte";
  import { find, isEmpty as isEmptyValue, sortBy } from "$lib/shared/utils/collection";

  const goalDndzone = dndzone;

  let isEmpty = $state(false);
  let config: UserConfig;
  let goals: GoalSummary[] = $state([]);
  let dragDisabled = writable(true);

  function handleConsider(e: CustomEvent<DndEvent<GoalSummary>>) {
    goals = e.detail.items;
  }

  async function handleFinalize(e: CustomEvent<DndEvent<GoalSummary>>) {
    goals = e.detail.items;
    dragDisabled.set(true);

    for (let i = 0; i < goals.length; i++) {
      const g = goals[i];
      g.priority = goals.length - i;
      const list = config.goals?.[g.type] || [];
      const goalConfig = find(list, (item: any) => item.name === g.name);
      if (goalConfig) {
        goalConfig.priority = g.priority;
      }
    }

    await save(config);
  }

  async function save(newConfig: UserConfig) {
    try {
      const res = await api.config.saveConfig(newConfig as unknown as string);
      if (res.success) {
        globalThis.USER_CONFIG = cloneDeep(newConfig);
        toast.toast({
          message: `Updated goal config`,
          type: "is-success"
        });
      } else {
        toast.toast({
          message: `Failed to save config: ${res.message || "Unknown error"}`,
          type: "is-danger",
          duration: 10000
        });
      }
    } catch (err: unknown) {
      toast.toast({
        message: `Failed to save config: ${err instanceof Error ? err.message : "Unknown error"}`,
        type: "is-danger",
        duration: 10000
      });
    }
  }

  onMount(async () => {
    const configRes = await api.config.getConfig();
    config = configRes.config as unknown as UserConfig;
    const goalsRes = await api.goals.getGoals();
    goals = (goalsRes.goals as unknown as GoalSummary[]) || [];
    goals = sortBy(goals, (g) => -g.priority);
    if (isEmptyValue(goals)) {
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
