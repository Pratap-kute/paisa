import type { PageLoad } from "./$types";

export const load = (({ params }) => {
  return {
    name: params.slug,
  };
}) satisfies PageLoad;
