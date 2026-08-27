<script lang="ts">
import type { JSONSchema7 } from "json-schema";
import JsonSchemaForm from "./JsonSchemaForm.svelte";

let value = $state<unknown[]>([]);
const schema = $state<JSONSchema7>({
  type: "array",
  default: [{ username: "john.doe", password: "" }],
  items: {
    type: "object",
    properties: {
      username: { type: "string" },
      password: { type: "string" },
    },
    required: ["username"],
  },
});
</script>

<JsonSchemaForm key="user_accounts" bind:value {schema} variant="panel" />
