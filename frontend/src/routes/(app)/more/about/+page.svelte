<script lang="ts">
  import Logo from "$lib/components/layout/Logo.svelte";
  import Card from "$lib/components/ui/Card.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import Section from "$lib/components/layout/Section.svelte";

  const links = [
    { name: "Chat", href: "https://matrix.to/#/#paisa:matrix.org", icon: "fa-solid fa-headset" },
    { name: "Issue", href: "https://github.com/ananthakumaran/paisa/issues", icon: "fas fa-bug" },
    {
      name: "Discussions",
      href: "https://github.com/ananthakumaran/paisa/discussions",
      icon: "fa-regular fa-comments"
    },
    {
      name: "Source Code",
      href: "https://github.com/ananthakumaran/paisa",
      icon: "fa-solid fa-code"
    },
    { name: "Documentation", href: "https://paisa.fyi", icon: "fa-solid fa-book" },
    {
      name: "Releases",
      href: "https://github.com/ananthakumaran/paisa/releases",
      icon: "fa-solid fa-download"
    },
    {
      name: "Demo",
      href: "https://demo.paisa.fyi",
      icon: "fa-solid fa-video"
    }
  ];

  function externalLink(url: string) {
    if (window.runtime) {
      window.runtime.BrowserOpenURL(url);
    } else {
      window.open(url, "_blank");
    }
  }
</script>

<Page width="analysis">
  <Section>
    <div class="mx-auto flex w-full max-w-[480px] flex-col gap-4">
      <Card padding="sm" class="text-center">
        <div><Logo size={128} /></div>
        <div class="text-3xl font-semibold text-[var(--paisa-primary)]">Paisa</div>
        <div class="text-sm text-[var(--paisa-muted-foreground)]">
          Version: <b class="text-[var(--paisa-foreground)]">0.8.1</b>
        </div>
      </Card>

      <Card padding="sm">
        <h3 class="mb-2 text-lg font-semibold text-[var(--paisa-foreground)]">Links</h3>
        <ul class="m-0 list-none space-y-2 p-0">
          {#each links as link}
            <li>
              <a
                href={link.href}
                class="inline-flex items-center gap-2 text-sm text-[var(--paisa-primary)] hover:underline"
                onclick={(e) => {
                  e.preventDefault();
                  externalLink(link.href);
                }}
              >
                <i class="{link.icon} w-4 text-center text-[var(--paisa-muted-foreground)]"></i>
                <span>{link.name}</span>
              </a>
            </li>
          {/each}
        </ul>
      </Card>
    </div>
  </Section>
</Page>
