import dotenv from "dotenv";
dotenv.config({ path: ".env.production.local", quiet: true });

const token = process.env.BLOB_READ_WRITE_TOKEN;

if (!token) {
  console.log("RESULT: BLOB_READ_WRITE_TOKEN is missing from .env.production.local");
  process.exit(1);
}

try {
  const { list } = await import("@vercel/blob");

  const result = await list({
    prefix: "database/db.json",
    token,
  });

  const blob = result.blobs.find(
    (item) => item.pathname === "database/db.json"
  );

  console.log("Blob listing: SUCCESS");
  console.log("Database file found:", Boolean(blob));

  if (!blob) {
    console.log("RESULT: Token can list, but database/db.json was not returned.");
    process.exit(2);
  }

  const response = await fetch(blob.url, {
    cache: "no-store",
    headers: { "Cache-Control": "no-cache, no-store, must-revalidate" },
  });

  console.log("Database download HTTP status:", response.status);
  console.log("Database download successful:", response.ok);

  if (response.ok) {
    const data = await response.json();
    console.log("Valid JSON object:", Boolean(data && typeof data === "object" && !Array.isArray(data)));
    console.log("Products array present:", Array.isArray(data?.products));
    console.log("Product count:", Array.isArray(data?.products) ? data.products.length : "N/A");
  } else {
    await response.body?.cancel();
  }
} catch (error) {
  console.log("RESULT: Blob access test failed.");
  console.log("Error name:", error?.name ?? "Unknown");
  console.log("Error message:", String(error?.message ?? error).slice(0, 500));
}
