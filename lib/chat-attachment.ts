export function createAttachmentContentDisposition(
  fileName: string,
  disposition: "attachment" | "inline" = "attachment",
) {
  const safeFileName = fileName
    .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
    .trim()
    .slice(0, 255) || "attachment";
  const asciiFileName = safeFileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encodedFileName = encodeURIComponent(safeFileName).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `${disposition}; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`;
}
