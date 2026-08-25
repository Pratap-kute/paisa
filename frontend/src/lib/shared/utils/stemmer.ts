/**
 * Compact Porter Stemmer implementation for English word normalization.
 * Replaces external npm:stemmer dependency.
 */

export function stemmer(word: string): string {
  if (word.length < 3) return word;
  let w = word.toLowerCase();
  const isInitialY = w[0] === "y";
  if (isInitialY) w = "Y" + w.slice(1);

  const isConsonant = (i: number): boolean => {
    const c = w[i];
    if (c === "a" || c === "e" || c === "i" || c === "o" || c === "u") {
      return false;
    }
    if (c === "y" || c === "Y") return i === 0 ? true : !isConsonant(i - 1);
    return true;
  };

  const measure = (): number => {
    let n = 0;
    let i = 0;
    while (i < w.length) {
      if (!isConsonant(i)) break;
      i++;
    }
    while (i < w.length) {
      while (i < w.length) {
        if (isConsonant(i)) break;
        i++;
      }
      if (i >= w.length) break;
      n++;
      while (i < w.length) {
        if (!isConsonant(i)) break;
        i++;
      }
    }
    return n;
  };

  const hasVowel = (): boolean => {
    for (let i = 0; i < w.length; i++) {
      if (!isConsonant(i)) return true;
    }
    return false;
  };

  const endsWithCVC = (str: string): boolean => {
    const len = str.length;
    if (len < 3) return false;
    const c1 = isConsonant(len - 3);
    const v = !isConsonant(len - 2);
    const c2 = isConsonant(len - 1);
    const last = str[len - 1];
    return c1 && v && c2 && last !== "w" && last !== "x" && last !== "y";
  };

  // Step 1a
  if (w.endsWith("sses")) w = w.slice(0, -2);
  else if (w.endsWith("ies")) w = w.slice(0, -2);
  else if (!w.endsWith("ss") && w.endsWith("s")) w = w.slice(0, -1);

  // Step 1b
  let extra1b = false;
  if (w.endsWith("eed")) {
    const stem = w.slice(0, -3);
    if (measure() > 0) w = stem + "ee";
  } else if (w.endsWith("ed")) {
    const stem = w.slice(0, -2);
    const orig = w;
    w = stem;
    if (hasVowel()) {
      extra1b = true;
    } else {
      w = orig;
    }
  } else if (w.endsWith("ing")) {
    const stem = w.slice(0, -3);
    const orig = w;
    w = stem;
    if (hasVowel()) {
      extra1b = true;
    } else {
      w = orig;
    }
  }

  if (extra1b) {
    if (w.endsWith("at") || w.endsWith("bl") || w.endsWith("iz")) {
      w += "e";
    } else if (
      w.length >= 2 &&
      w[w.length - 1] === w[w.length - 2] &&
      !["l", "s", "z"].includes(w[w.length - 1])
    ) {
      w = w.slice(0, -1);
    } else if (measure() === 1 && endsWithCVC(w)) {
      w += "e";
    }
  }

  // Step 1c
  if (w.endsWith("y")) {
    const stem = w.slice(0, -1);
    const orig = w;
    w = stem;
    if (hasVowel()) w = stem + "i";
    else w = orig;
  }

  // Step 2
  const step2Pairs: [string, string][] = [
    ["ational", "ate"],
    ["tional", "tion"],
    ["enci", "ence"],
    ["anci", "ance"],
    ["izer", "ize"],
    ["bli", "ble"],
    ["alli", "al"],
    ["entli", "ent"],
    ["eli", "e"],
    ["ousli", "ous"],
    ["ization", "ize"],
    ["ation", "ate"],
    ["ator", "ate"],
    ["alism", "al"],
    ["iveness", "ive"],
    ["fulness", "ful"],
    ["ousness", "ous"],
    ["aliti", "al"],
    ["iviti", "ive"],
    ["biliti", "ble"],
    ["logi", "log"],
  ];
  for (const [suffix, repl] of step2Pairs) {
    if (w.endsWith(suffix)) {
      const stem = w.slice(0, -suffix.length);
      const orig = w;
      w = stem;
      if (measure() > 0) w = stem + repl;
      else w = orig;
      break;
    }
  }

  // Step 3
  const step3Pairs: [string, string][] = [
    ["icate", "ic"],
    ["ative", ""],
    ["alize", "al"],
    ["iciti", "ic"],
    ["ical", "ic"],
    ["ful", ""],
    ["ness", ""],
  ];
  for (const [suffix, repl] of step3Pairs) {
    if (w.endsWith(suffix)) {
      const stem = w.slice(0, -suffix.length);
      const orig = w;
      w = stem;
      if (measure() > 0) w = stem + repl;
      else w = orig;
      break;
    }
  }

  // Step 4
  const step4Suffixes = [
    "al",
    "ance",
    "ence",
    "er",
    "ic",
    "able",
    "ible",
    "ant",
    "ement",
    "ment",
    "ent",
    "ou",
    "ism",
    "ate",
    "iti",
    "ous",
    "ive",
    "ize",
  ];
  let matched4 = false;
  for (const suffix of step4Suffixes) {
    if (w.endsWith(suffix)) {
      const stem = w.slice(0, -suffix.length);
      const orig = w;
      w = stem;
      if (measure() > 1) {
        matched4 = true;
      } else {
        w = orig;
      }
      break;
    }
  }
  if (!matched4 && w.endsWith("ion")) {
    const stem = w.slice(0, -3);
    const orig = w;
    w = stem;
    if (!(measure() > 1 && (stem.endsWith("s") || stem.endsWith("t")))) {
      w = orig;
    }
  }

  // Step 5a
  if (w.endsWith("e")) {
    const stem = w.slice(0, -1);
    const orig = w;
    w = stem;
    const m = measure();
    if (!(m > 1 || (m === 1 && !endsWithCVC(w)))) {
      w = orig;
    }
  }

  // Step 5b
  if (w.length >= 2 && w.endsWith("ll")) {
    const stem = w.slice(0, -1);
    const orig = w;
    w = stem;
    if (measure() <= 1) {
      w = orig;
    }
  }

  if (isInitialY) w = "y" + w.slice(1);
  return w;
}
