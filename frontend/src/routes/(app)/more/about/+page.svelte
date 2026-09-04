<script lang="ts">
import Logo from "$lib/shared/layout/Logo.svelte";
import Card from "$lib/shared/ui/Card.svelte";
import Page from "$lib/shared/layout/Page.svelte";
import PageHeader from "$lib/shared/layout/PageHeader.svelte";
import Section from "$lib/shared/layout/Section.svelte";
import Badge from "$lib/shared/ui/Badge.svelte";

const resources = [
  {
    name: "Documentation",
    desc: "Guides, tutorials, and ledger configuration reference",
    href: "https://paisa.fyi",
    icon: "fa-solid fa-book",
    badge: "Docs",
  },
  {
    name: "Source Code",
    desc: "GitHub repository (Fork maintained by Pratap Kute)",
    href: "https://github.com/Pratap-kute/paisa",
    icon: "fa-brands fa-github",
    badge: "GitHub",
  },
  {
    name: "Releases & Changelog",
    desc: "Latest release downloads, updates, and release notes",
    href: "https://github.com/Pratap-kute/paisa/releases",
    icon: "fa-solid fa-download",
    badge: "v0.9.1",
  },
  {
    name: "Live Demo",
    desc: "Interactive demo environment with sample ledger data",
    href: "https://demo.paisa.fyi",
    icon: "fa-solid fa-desktop",
    badge: "Demo",
  },
  {
    name: "Community Discussions",
    desc: "Ask questions, share workflows, and request features",
    href: "https://github.com/Pratap-kute/paisa/discussions",
    icon: "fa-regular fa-comments",
    badge: "Community",
  },
  {
    name: "Issue Tracker",
    desc: "Report bugs or submit feature suggestions",
    href: "https://github.com/Pratap-kute/paisa/issues",
    icon: "fas fa-bug",
    badge: "Support",
  },
  {
    name: "Matrix Chat",
    desc: "Real-time discussion with community contributors",
    href: "https://matrix.to/#/#paisa:matrix.org",
    icon: "fa-solid fa-comments",
    badge: "Chat",
  },
];

function externalLink(url: string) {
  if (typeof window !== "undefined" && window.runtime?.BrowserOpenURL) {
    window.runtime.BrowserOpenURL(url);
  } else {
    window.open(url, "_blank");
  }
}
</script>

<svelte:head>
  <title>About - Paisa</title>
</svelte:head>

<Page width="analysis">
  <PageHeader
    title="About Paisa"
    description="Personal finance management with plain text accounting, privacy-first analytics, and portfolio tracking"
  />

  <Section>
    <div class="flex flex-col gap-6">
      <!-- Hero Branding Card -->
      <Card padding="lg" class="w-full overflow-hidden">
        <div
          class="flex flex-col items-center justify-between gap-6 md:flex-row md:items-start">
          <div
            class="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
            <div
              class="shrink-0 transition-transform duration-300 hover:scale-105">
              <Logo size={96} />
            </div>
            <div>
              <div
                class="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <h1
                  class="text-2xl font-bold tracking-tight text-foreground">
                  Paisa
                </h1>
                <Badge variant="primary" size="sm" rounded>v0.9.1</Badge>
                <Badge variant="neutral" size="sm" rounded>AGPL-3.0</Badge>
              </div>
              <p class="mt-1 text-sm text-muted-foreground">
                Local-first, privacy-focused financial analytics & plain text accounting for personal ledgers.
              </p>
              <div
                class="mt-2.5 flex flex-wrap items-center justify-center gap-2 text-xs md:justify-start">
                <span class="font-medium text-foreground">
                  Maintained by <strong class="text-primary">Pratap Kute</strong>
                </span>
                <span class="text-muted-foreground">•</span>
                <span class="text-muted-foreground">
                  Originally created by <strong class="text-foreground">Ananthakumaran</strong>
                </span>
              </div>
              <div
                class="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-muted-foreground md:justify-start">
                <span class="inline-flex items-center gap-1">
                  <i class="fas fa-shield-halved text-positive"></i>
                  100% Offline & Private
                </span>
                <span>•</span>
                <span class="inline-flex items-center gap-1">
                  <i class="fas fa-scale-balanced text-primary"></i>
                  Double-Entry Ledger
                </span>
                <span>•</span>
                <span class="inline-flex items-center gap-1">
                  <i class="fas fa-bolt text-warning"></i>
                  Fast Local Analytics
                </span>
              </div>
            </div>
          </div>

          <div class="flex shrink-0 flex-col items-center gap-2 md:items-end">
            <button
              type="button"
              class="inline-flex cursor-pointer items-center gap-2 rounded-[var(--paisa-radius-md)] border border-border-subtle bg-surface-raised px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-[var(--paisa-primary)] hover:bg-surface-hover"
              onclick={() => externalLink("https://github.com/Pratap-kute/paisa")}
            >
              <i class="fa-brands fa-github"></i>
              <span>Star on GitHub</span>
            </button>
            <span
              class="text-[0.6875rem] text-muted-foreground">Licensed under GNU AGPL-3.0</span>
          </div>
        </div>
      </Card>

      <!-- Key Resources & Links Grid -->
      <div>
        <h2
          class="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Resources & Community
        </h2>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {#each resources as item}
            <a
              href={item.href}
              class="group flex flex-col justify-between rounded-[var(--paisa-radius-md)] border border-border-subtle bg-surface p-3.5 transition-all hover:border-[var(--paisa-primary)] hover:bg-surface-hover hover:shadow-sm"
              onclick={(e) => {
                e.preventDefault();
                externalLink(item.href);
              }}
            >
              <div>
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2 text-sm font-semibold text-foreground group-hover:text-primary">
                    <i class="{item.icon} w-4 text-center text-muted-foreground group-hover:text-primary"></i>
                    <span>{item.name}</span>
                  </div>
                  <span class="inline-flex items-center rounded bg-surface-raised px-1.5 py-0.5 text-[0.6875rem] font-mono text-muted-foreground border border-border-subtle">
                    {item.badge}
                  </span>
                </div>
                <p class="mt-1.5 text-xs text-muted-foreground">
                  {item.desc}
                </p>
              </div>

              <div class="mt-3 flex items-center text-[0.6875rem] font-medium text-muted-foreground group-hover:text-primary">
                <span>Visit link</span>
                <i class="fas fa-arrow-up-right-from-square ml-1 text-[0.625rem]"></i>
              </div>
            </a>
          {/each}
        </div>
      </div>

      <!-- System & Environment Highlights -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card padding="md" class="w-full">
          <div
            class="flex items-center gap-2 text-sm font-semibold text-foreground">
            <i class="fas fa-keyboard text-primary"></i>
            <span>Keyboard Shortcuts</span>
          </div>
          <div
            class="mt-2.5 flex flex-col gap-2 text-xs text-muted-foreground">
            <div class="flex items-center justify-between">
              <span>Command Palette</span>
              <kbd
                class="rounded border border-border-subtle bg-surface-raised px-1.5 py-0.5 font-mono text-[0.6875rem] text-foreground">Ctrl + K / ⌘K</kbd>
            </div>
            <div class="flex items-center justify-between">
              <span>Save File in Editor</span>
              <kbd
                class="rounded border border-border-subtle bg-surface-raised px-1.5 py-0.5 font-mono text-[0.6875rem] text-foreground">Ctrl + S / ⌘S</kbd>
            </div>
            <div class="flex items-center justify-between">
              <span>Format Journal</span>
              <kbd
                class="rounded border border-border-subtle bg-surface-raised px-1.5 py-0.5 font-mono text-[0.6875rem] text-foreground">Ctrl + Shift + I</kbd>
            </div>
          </div>
        </Card>

        <Card padding="md" class="w-full">
          <div
            class="flex items-center gap-2 text-sm font-semibold text-foreground">
            <i class="fas fa-cube text-primary"></i>
            <span>Architecture & Privacy</span>
          </div>
          <div
            class="mt-2.5 flex flex-col gap-1.5 text-xs text-muted-foreground">
            <p>• Plain text ledger engine supporting standard double-entry bookkeeping format.</p>
            <p>• Data never leaves your machine. Zero tracking, zero telemetry, 100% offline.</p>
            <p>• Built with modern web technologies: Svelte 5, TypeScript, and ECharts.</p>
          </div>
        </Card>
      </div>
    </div>
  </Section>
</Page>
