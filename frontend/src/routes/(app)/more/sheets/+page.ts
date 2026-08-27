import { redirect } from "@sveltejs/kit";
import { createApiClient } from "$lib/api";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  const client = createApiClient({ customFetch: fetch });
  const { files } = await client.sheets.getSheetFiles();
  if (files && files.length > 0) {
    redirect(307, `/more/sheets/${files[0].name}`);
  }
};
