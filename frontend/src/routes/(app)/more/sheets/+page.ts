import { redirect } from "@sveltejs/kit";
import { ajax } from "$lib/core/utils";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  const { files } = await ajax("/api/sheets/files", { customFetch: fetch });
  if (files.length > 0) {
    redirect(307, `/more/sheets/${files[0].name}`);
  }
};
