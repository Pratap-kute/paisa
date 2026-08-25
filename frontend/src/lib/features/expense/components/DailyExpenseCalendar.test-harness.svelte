<script lang="ts">
import type { ComponentProps } from "svelte";
import TooltipProvider from "$lib/shared/ui/TooltipProvider.svelte";
import DailyExpenseCalendar from "./DailyExpenseCalendar.svelte";

let props: ComponentProps<typeof DailyExpenseCalendar> = $props();
</script>

<TooltipProvider>
  <DailyExpenseCalendar {...props} />
</TooltipProvider>
