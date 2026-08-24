// deno-lint-ignore-file no-explicit-any -- Import fixtures intentionally exercise heterogeneous spreadsheet rows.
import { describe, it as test } from "@std/testing/bdd";
import { expect } from "@std/expect";

import {
  asRows,
  columnIndexToLetter,
  parse,
  render,
  renderWithMetadata,
} from "./spreadsheet";
import helpers from "./template_helpers";
import { mapValues, trim } from "es-toolkit";
import Handlebars from "handlebars";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
dayjs.extend(customParseFormat);
import isSameOrBefore from "dayjs/plugin/isSameOrBefore.js";
dayjs.extend(isSameOrBefore);
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js"; // dependent on utc plugin
dayjs.extend(utc);
dayjs.extend(timezone);
import localeData from "dayjs/plugin/localeData.js";
dayjs.extend(localeData);
import updateLocale from "dayjs/plugin/updateLocale.js";
import { find } from "$lib/core/collection";
dayjs.extend(updateLocale);

Handlebars.registerHelper(
  mapValues(helpers, (helper, name) => {
    return function (this: any, ...args: any[]) {
      try {
        return helper.apply(this, args);
      } catch (e) {
        console.log("Error in helper", name, args, e);
      }
    };
  }),
);

function fixturePath(path: string): string {
  try {
    Deno.statSync(`../fixture/${path}`);
    return `../fixture/${path}`;
  } catch (_) {
    return `fixture/${path}`;
  }
}

function templatePath(path: string): string {
  try {
    Deno.statSync(`../backend/pkg/model/template/templates/${path}`);
    return `../backend/pkg/model/template/templates/${path}`;
  } catch (_) {
    try {
      Deno.statSync(`../backend/internal/model/template/templates/${path}`);
      return `../backend/internal/model/template/templates/${path}`;
    } catch (_) {
      return `pkg/model/template/templates/${path}`;
    }
  }
}

describe("import", () => {
  Array.from(Deno.readDirSync(fixturePath("import"))).forEach(
    ({ name: dir }) => {
      test(dir, async () => {
        const files = Array.from(
          Deno.readDirSync(fixturePath(`import/${dir}`)),
          ({ name }) => name,
        );
        for (const file of files) {
          const [name, extension] = file.split(".");
          if (extension === "ledger") {
            const inputFile = find(
              files,
              (f) => f != file && f.startsWith(name),
            );
            if (!inputFile || inputFile.endsWith(".pdf")) {
              break;
            }
            const input = Deno.readFileSync(
              fixturePath(`import/${dir}/${inputFile}`),
            );
            const output = Deno.readTextFileSync(
              fixturePath(`import/${dir}/${file}`),
            );
            const template = Deno.readTextFileSync(
              templatePath(`${dir}.handlebars`),
            );

            const compiled = Handlebars.compile(template);
            const result = await parse(new File([input as any], inputFile));
            const rows = asRows(result);

            const actual = render(rows, compiled, { trim: true });

            expect(actual).toBe(trim(output));
          }
        }
      });
    },
  );
});

describe("template helpers", () => {
  test("acronym", () => {
    expect(helpers.acronym("Foo Bar baz")).toBe("FBB");
    expect(helpers.acronym("foo   the bar")).toBe("FB");
    expect(helpers.acronym("Motital S & P 500")).toBe("MSP");
    expect(helpers.acronym("Axis Liquid Growth Direct Plan")).toBe("AL");
  });
});

describe("spreadsheet column indexing", () => {
  test("converts index to excel column letters beyond Z", () => {
    expect(columnIndexToLetter(0)).toBe("A");
    expect(columnIndexToLetter(25)).toBe("Z");
    expect(columnIndexToLetter(26)).toBe("AA");
    expect(columnIndexToLetter(27)).toBe("AB");
    expect(columnIndexToLetter(51)).toBe("AZ");
    expect(columnIndexToLetter(52)).toBe("BA");
    expect(columnIndexToLetter(701)).toBe("ZZ");
    expect(columnIndexToLetter(702)).toBe("AAA");
  });

  test("asRows properly indexes columns beyond Z", () => {
    const cells = Array.from({ length: 30 }, (_, i) => `val_${i}`);
    const rows = asRows({ data: [cells] });
    expect(rows[0]["A"]).toBe("val_0");
    expect(rows[0]["Z"]).toBe("val_25");
    expect(rows[0]["AA"]).toBe("val_26");
    expect(rows[0]["AB"]).toBe("val_27");
    expect(rows[0]["AD"]).toBe("val_29");
  });
});

describe("spreadsheet render metadata", () => {
  test("preserves render output and records generated source rows", () => {
    const rows = asRows({
      data: [
        ["2026/04/01", "Coffee", "100"],
        ["", "", ""],
        ["2026/04/02", "Lunch", "250"],
      ],
    });
    const template = Handlebars.compile(
      "{{#if ROW.A}}{{ ROW.A }} {{ ROW.B }}\n  Expenses:Food  INR {{ ROW.C }}\n  Assets:Cash{{/if}}",
    );

    const metadata = renderWithMetadata(rows, template, { trim: true });

    expect(metadata.content).toBe(render(rows, template, { trim: true }));
    expect(metadata.generatedCount).toBe(2);
    expect(metadata.rows.map((row) => row.sourceRowIndex)).toEqual([0, 2]);
    expect(metadata.errors).toEqual([]);
    expect(metadata.rows[0].lineRange).toEqual({ from: 1, to: 3 });
    expect(metadata.rows[1].lineRange).toEqual({ from: 5, to: 7 });
  });

  test("respects reverse ordering", () => {
    const rows = asRows({
      data: [
        ["2026/04/01", "Coffee", "100"],
        ["2026/04/02", "Lunch", "250"],
      ],
    });
    const template = Handlebars.compile(
      "{{ ROW.A }} {{ ROW.B }}\n  Expenses:Food  INR {{ ROW.C }}\n  Assets:Cash",
    );

    const metadata = renderWithMetadata(rows, template, {
      reverse: true,
      trim: true,
    });

    expect(metadata.content).toBe(render(rows, template, {
      reverse: true,
      trim: true,
    }));
    expect(metadata.rows.map((row) => row.sourceRowIndex)).toEqual([1, 0]);
  });

  test("captures row render errors", () => {
    const rows = asRows({ data: [["ok"], ["bad"], ["ok"]] });
    const template = ((context: any) => {
      if (context.ROW.A === "bad") {
        throw new Error("bad row");
      }
      return `${context.ROW.A}\n`;
    }) as Handlebars.TemplateDelegate;

    const metadata = renderWithMetadata(rows, template, { trim: true });

    expect(metadata.generatedCount).toBe(2);
    expect(metadata.errors).toEqual([{
      sourceRowIndex: 1,
      message: "bad row",
    }]);
  });
});
