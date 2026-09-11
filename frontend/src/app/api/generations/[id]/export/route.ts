import { NextRequest, NextResponse } from "next/server";
import { supabaseFetch } from "@/lib/supabase-server";

const encoder = new TextEncoder();
type ZipEntry = { name: string; data: Uint8Array };
const crcTable = Array.from({ length: 256 }, (_, index) => { let value = index; for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ value >>> 1 : value >>> 1; return value >>> 0; });
function crc32(data: Uint8Array) { let value = 0xffffffff; for (const byte of data) value = crcTable[(value ^ byte) & 255] ^ value >>> 8; return (value ^ 0xffffffff) >>> 0; }
function put16(out: number[], value: number) { out.push(value & 255, value >>> 8 & 255); }
function put32(out: number[], value: number) { out.push(value & 255, value >>> 8 & 255, value >>> 16 & 255, value >>> 24 & 255); }
function makeZip(entries: ZipEntry[]) {
  const out: number[] = []; const directory: number[] = []; let offset = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name); const checksum = crc32(entry.data);
    put32(out, 0x04034b50); put16(out, 20); put16(out, 0); put16(out, 0); put16(out, 0); put16(out, 0); put32(out, checksum); put32(out, entry.data.length); put32(out, entry.data.length); put16(out, name.length); put16(out, 0); out.push(...name, ...entry.data);
    put32(directory, 0x02014b50); put16(directory, 20); put16(directory, 20); put16(directory, 0); put16(directory, 0); put16(directory, 0); put16(directory, 0); put32(directory, checksum); put32(directory, entry.data.length); put32(directory, entry.data.length); put16(directory, name.length); put16(directory, 0); put16(directory, 0); put16(directory, 0); put16(directory, 0); put32(directory, 0); put32(directory, offset); directory.push(...name); offset = out.length;
  }
  const directoryOffset = out.length; out.push(...directory); put32(out, 0x06054b50); put16(out, 0); put16(out, 0); put16(out, entries.length); put16(out, entries.length); put32(out, directory.length); put32(out, directoryOffset); put16(out, 0); return new Uint8Array(out);
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const generated = await supabaseFetch(`/rest/v1/generations?id=eq.${encodeURIComponent(id)}&select=title,social_posts,key_points,estimated_cost`);
    const [generation] = await generated.json();
    const assetResult = await supabaseFetch(`/rest/v1/assets?generation_id=eq.${encodeURIComponent(id)}&select=asset_type,format,storage_path`);
    const assets = await assetResult.json() as Array<{ asset_type: string; format: string; storage_path: string }>;
    if (!generated.ok || !generation) return NextResponse.json({ detail: "Generation not found" }, { status: 404 });
    const posts = generation.social_posts || {};
    const entries: ZipEntry[] = [{ name: "copy/telegram.txt", data: encoder.encode(posts.telegram || "") }, { name: "copy/instagram.txt", data: encoder.encode(posts.instagram || "") }, { name: "copy/linkedin.txt", data: encoder.encode(posts.linkedin || "") }, { name: "README.txt", data: encoder.encode(`Title: ${generation.title || ""}\nEstimated cost: $${generation.estimated_cost || 0}\n\n${(generation.key_points || []).join("\n")}`) }];
    for (const asset of assets) { const file = await supabaseFetch(`/storage/v1/object/generated-assets/${asset.storage_path}`); if (file.ok) entries.push({ name: `assets/${asset.asset_type}.${asset.format}`, data: new Uint8Array(await file.arrayBuffer()) }); }
    return new NextResponse(makeZip(entries), { headers: { "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="media-pack-${id}.zip"` } });
  } catch { return NextResponse.json({ detail: "Please sign in" }, { status: 401 }); }
}
