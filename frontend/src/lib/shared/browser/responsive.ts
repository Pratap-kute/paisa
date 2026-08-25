export function isMobile() {
  return globalThis.innerWidth < 769;
}

export function rem(value: number) {
  if (isMobile()) {
    return value * 0.857;
  } else {
    return value;
  }
}
