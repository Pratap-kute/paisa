export function tooltip(
  rows: Array<Array<string | string[]>>,
  options: {
    header?: string;
    total?: string;
  } = {},
) {
  if (options.total && rows.length > 0) {
    const totalRow: Array<string | string[]> = [
      ["Total", "paisa-text-bold"],
      [options.total, "paisa-text-bold paisa-text-right"],
    ];

    for (let i = 2; i < rows[0].length; i++) {
      totalRow.unshift("");
    }

    rows.push(totalRow);
  }

  if (options.header && rows.length > 0) {
    const headerRow: Array<string | string[]> = [
      [
        options.header,
        "paisa-text-bold paisa-text-centered",
        rows[0].length.toString(),
      ],
    ];
    rows.unshift(headerRow);
  }

  const trs = rows
    .map((r) => {
      const cells = r
        .map((c) => {
          if (typeof c == "string") {
            return `<td>${c}</td>`;
          } else {
            if (c.length == 3) {
              return `<td class='${c[1]}' colspan='${c[2]}'>${c[0]}</td>`;
            }
            return `<td class='${c[1]}'>${c[0]}</td>`;
          }
        })
        .join("\n");

      return `<tr>${cells}</tr>`;
    })
    .join("\n");
  return `<table class='paisa-popup-table popup-table'><tbody>${trs}</tbody></table>`;
}
