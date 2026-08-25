import { drop, dropRight, last, take } from "es-toolkit";
import { first } from "$lib/shared/utils/collection";
export function firstName(account: string) {
  return first(account.split(":"));
}

export function lastName(account: string) {
  return last(account.split(":"));
}

export function secondName(account: string) {
  return account.split(":")[1];
}

export function firstNames(account: string, n: number) {
  return take(account.split(":"), n).join(":");
}

export function restName(account: string) {
  return drop(account.split(":"), 1).join(":");
}

export function parentName(account: string) {
  return dropRight(account.split(":"), 1).join(":");
}

export function depth(account: string) {
  return account.split(":").length;
}
