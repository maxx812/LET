import path from "node:path";
import { AppError } from "../errors/app-error.js";

function parseMultipartPayload(buffer, boundary) {
  const body = buffer.toString("utf8");
  const marker = `--${boundary}`;
  const segments = body.split(marker).slice(1, -1);
  const fields = {};
  let file = null;

  for (const segment of segments) {
    const trimmed = segment.replace(/^\r\n/, "").replace(/\r\n$/, "");
    if (!trimmed) continue;

    const headerEnd = trimmed.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;

    const headerText = trimmed.slice(0, headerEnd);
    const content = trimmed.slice(headerEnd + 4).replace(/\r\n$/, "");
    const dispositionLine = headerText
      .split("\r\n")
      .find((line) => line.toLowerCase().startsWith("content-disposition"));

    if (!dispositionLine) continue;

    const nameMatch = dispositionLine.match(/name="([^"]+)"/i);
    const filenameMatch = dispositionLine.match(/filename="([^"]*)"/i);
    const typeLine = headerText.split("\r\n").find((line) => line.toLowerCase().startsWith("content-type"));
    const contentType = typeLine ? typeLine.split(":")[1].trim() : "text/plain";
    const fieldName = nameMatch?.[1];

    if (!fieldName) continue;

    if (filenameMatch) {
      file = {
        fieldName,
        originalName: path.basename(filenameMatch[1] || "upload.csv"),
        mimeType: contentType,
        buffer: Buffer.from(content, "utf8"),
        size: Buffer.byteLength(content, "utf8")
      };
    } else {
      fields[fieldName] = content;
    }
  }

  return { fields, file };
}

export function parseSingleMultipartFile(fieldName, options = {}) {
  const {
    maxFileSizeBytes = 2 * 1024 * 1024,
    allowedMimeTypes = [
      "text/csv",
      "application/csv",
      "application/vnd.ms-excel",
      "application/octet-stream",
      "text/plain",
      "application/json"
    ]
  } = options;

  return async function multipartMiddleware(req, _res, next) {
    try {
      const contentType = req.headers["content-type"] || "";

      if (!contentType.startsWith("multipart/form-data")) {
        throw new AppError(415, "Content-Type must be multipart/form-data", {
          code: "UNSUPPORTED_MEDIA_TYPE"
        });
      }

      const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
      const boundary = boundaryMatch?.[1] || boundaryMatch?.[2];

      if (!boundary) {
        throw new AppError(400, "Multipart boundary is missing", {
          code: "INVALID_MULTIPART"
        });
      }

      const chunks = [];
      let totalBytes = 0;

      for await (const chunk of req) {
        totalBytes += chunk.length;
        if (totalBytes > maxFileSizeBytes * 2) {
          throw new AppError(413, "Multipart payload is too large", {
            code: "PAYLOAD_TOO_LARGE"
          });
        }
        chunks.push(chunk);
      }

      const { fields, file } = parseMultipartPayload(Buffer.concat(chunks), boundary);
      req.body = { ...req.body, ...fields };

      if (!file || file.fieldName !== fieldName) {
        throw new AppError(400, `Missing multipart file field "${fieldName}"`, {
          code: "FILE_REQUIRED"
        });
      }

      const isCsv = file.originalName.toLowerCase().endsWith(".csv");
      const isJson = file.originalName.toLowerCase().endsWith(".json");

      if (!isCsv && !isJson) {
        throw new AppError(400, "Only CSV or JSON uploads are allowed", {
          code: "INVALID_FILE_EXTENSION"
        });
      }

      if (!allowedMimeTypes.includes(file.mimeType)) {
        throw new AppError(400, "Unsupported CSV content type", {
          code: "INVALID_FILE_TYPE",
          details: { received: file.mimeType }
        });
      }

      if (file.size > maxFileSizeBytes) {
        throw new AppError(413, "CSV file is too large", {
          code: "FILE_TOO_LARGE"
        });
      }

      req.file = file;
      next();
    } catch (error) {
      next(error);
    }
  };
}
