import type { PageLoad } from "./$types";

export const load = (({ params }) => {
  return {
    account: params.slug,
  };
}) satisfies PageLoad;
