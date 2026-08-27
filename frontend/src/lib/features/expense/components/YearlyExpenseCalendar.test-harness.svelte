<script lang="ts">
import type { ComponentProps } from "svelte";
import TooltipProvider from "$lib/shared/ui/TooltipProvider.svelte";
import YearlyExpenseCalendar from "./YearlyExpenseCalendar.svelte";

let props: ComponentProps<typeof YearlyExpenseCalendar> = $props();
</script>

<TooltipProvider>
  <YearlyExpenseCalendar {...props} />
</TooltipProvider>
