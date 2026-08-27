import { redirect } from "@sveltejs/kit";
import { createApiClient } from "$lib/api";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  const client = createApiClient({ customFetch: fetch });
  const { files } = await client.editor.getEditorFiles();
  if (files && files.length > 0) {
    redirect(307, `/ledger/editor/${files[0].name}`);
  }

  return { journalMissing: true };
};
