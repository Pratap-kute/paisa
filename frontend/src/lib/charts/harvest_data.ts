import type { Harvestable } from "$lib/core/utils";

export type HarvestCalculation = [units: number, amount: number, gain: number];

export function filterHarvestables(values: Harvestable[]): Harvestable[] {
  return values.filter((value) => value.harvestable_units > 0);
}

export function unitsRequiredFromGain(
  harvestable: Harvestable,
  taxableGain: number,
): HarvestCalculation {
  let gain = 0;
  let amount = 0;
  let units = 0;
  const available = [...harvestable.harvest_breakdown];
  while (taxableGain > gain && available.length > 0) {
    const breakdown = available.shift()!;
    if (breakdown.tax.taxable < taxableGain - gain) {
      gain += breakdown.tax.taxable;
      units += breakdown.units;
      amount += breakdown.current_price;
    } else if (breakdown.tax.taxable !== 0) {
      const partialUnits = ((taxableGain - gain) * breakdown.units) /
        breakdown.tax.taxable;
      units += partialUnits;
      amount += partialUnits * harvestable.current_unit_price;
      gain = taxableGain;
    } else {
      break;
    }
  }
  return [units, amount, gain];
}

export function unitsRequiredFromAmount(
  harvestable: Harvestable,
  expectedAmount: number,
): HarvestCalculation {
  let gain = 0;
  let amount = 0;
  let units = 0;
  const available = [...harvestable.harvest_breakdown];
  while (expectedAmount > amount && available.length > 0) {
    const breakdown = available.shift()!;
    if (breakdown.current_price < expectedAmount - amount) {
      gain += breakdown.tax.taxable;
      units += breakdown.units;
      amount += breakdown.current_price;
    } else if (harvestable.current_unit_price !== 0 && breakdown.units !== 0) {
      const partialUnits = (expectedAmount - amount) /
        harvestable.current_unit_price;
      units += partialUnits;
      amount = expectedAmount;
      gain += partialUnits * (breakdown.tax.taxable / breakdown.units);
    } else {
      break;
    }
  }
  return [units, amount, gain];
}

export function harvestablePercentage(harvestable: Harvestable): number {
  if (harvestable.total_units === 0) return 0;
  return (harvestable.harvestable_units / harvestable.total_units) * 100;
}
