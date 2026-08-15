<script lang="ts">
  import Logo from "$lib/components/layout/Logo.svelte";
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

  import Card from "$lib/components/ui/Card.svelte";
  import Page from "$lib/components/layout/Page.svelte";
  import Section from "$lib/components/layout/Section.svelte";

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
    <div class="paisa-about-centered">
      <Card padding="sm" class="has-text-centered">
        <div><Logo size={128} /></div>
        <div class="is-size-3 is-primary-color">Paisa</div>
        <div>
          Version: <b>0.8.0</b>
        </div>
      </Card>

      <Card padding="sm">
        <h3 class="is-size-5 mb-1">Links</h3>
        <ul>
          {#each links as link}
            <li>
              <a href={link.href} onclick={(e) => { e.preventDefault(); externalLink(link.href); }}>
                <span class="icon is-small">
                  <i class={link.icon}></i>
                </span>
                <span>{link.name}</span>
              </a>
            </li>
          {/each}
        </ul>
      </Card>
    </div>
  </Section>
</Page>

<style lang="scss">
  .paisa-about-centered {
    max-width: 480px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--paisa-space-4);
  }
</style>
