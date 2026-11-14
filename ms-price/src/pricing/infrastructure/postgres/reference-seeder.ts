export interface ReferencePriceEntry {
  presentationId: string;
  segment: 'B2B' | 'B2C';
  amount: string;
}

export interface ReferenceSeedClient {
  query<T extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ): Promise<{ rowCount: number | null; rows: T[] }>;
}

function moneyFromCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function buildReferencePriceEntries(
  unitPresentationId: string,
  casePresentationId: string,
  retailUnitAmount: number,
  wholesaleUnitAmount: number,
): ReferencePriceEntry[] {
  const retailUnitCents = Math.round(retailUnitAmount * 100);
  const wholesaleUnitCents = Math.round(wholesaleUnitAmount * 100);
  return [
    { presentationId: unitPresentationId, segment: 'B2C', amount: moneyFromCents(retailUnitCents) },
    { presentationId: casePresentationId, segment: 'B2C', amount: moneyFromCents(retailUnitCents * 9) },
    { presentationId: casePresentationId, segment: 'B2B', amount: moneyFromCents(wholesaleUnitCents * 12) },
  ];
}

export async function seedMissingPrices(
  client: ReferenceSeedClient,
  entries: readonly ReferencePriceEntry[],
  actorUserId: string,
): Promise<number> {
  let inserted = 0;
  for (const entry of entries) {
    const existing = await client.query(
      'SELECT 1 FROM prices WHERE presentation_id=$1 AND segmento=$2 AND activo LIMIT 1',
      [entry.presentationId, entry.segment],
    );
    if (existing.rowCount) continue;

    const result = await client.query<{ id: string; importe: string }>(
      'INSERT INTO prices(presentation_id,segmento,importe,vigente_desde) VALUES($1,$2,$3,now()) RETURNING id,importe',
      [entry.presentationId, entry.segment, entry.amount],
    );
    await client.query(
      'INSERT INTO price_changes(price_id,importe_anterior,importe_nuevo,actor_user_id) VALUES($1,NULL,$2,$3)',
      [result.rows[0].id, result.rows[0].importe, actorUserId],
    );
    inserted += 1;
  }
  return inserted;
}
