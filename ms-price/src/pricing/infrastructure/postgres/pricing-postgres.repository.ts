import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import type { PricingRepository } from '../../application/pricing.repository.js';
import type { CustomerSegment, PriceChangeRecord, PriceInput, PriceRecord, PromotionInput, PromotionRecord } from '../../domain/pricing-model.js';

export class PricingPostgresRepository implements PricingRepository {
  constructor(private readonly pool: Pool) {}
  async findCurrentPrices(ids: readonly string[], segment: CustomerSegment, at: Date) {
    const { rows } = await this.pool.query('SELECT * FROM prices WHERE presentation_id = ANY($1::uuid[]) AND segmento=$2 AND activo AND vigente_desde <= $3 AND (vigente_hasta IS NULL OR vigente_hasta > $3)', [ids, segment, at]);
    return rows.map(price);
  }
  async listPrices(id: string, segment: CustomerSegment) { const { rows } = await this.pool.query('SELECT * FROM prices WHERE presentation_id=$1 AND segmento=$2', [id, segment]); return rows.map(price); }
  async listPricesForProduct(ids: readonly string[], segment: CustomerSegment) { const { rows } = await this.pool.query('SELECT * FROM prices WHERE presentation_id = ANY($1::uuid[]) AND segmento=$2', [ids, segment]); return rows.map(price); }
  async findCurrentPromotions(ids: readonly string[], segment: CustomerSegment, at: Date) {
    const { rows } = await this.pool.query(`SELECT p.*, array_agg(pp.presentation_id::text) AS presentation_ids FROM promotions p JOIN promotion_presentations pp ON pp.promotion_id=p.id WHERE pp.presentation_id = ANY($1::uuid[]) AND p.segmento=$2 AND p.activo AND p.vigente_desde <= $3 AND p.vigente_hasta > $3 GROUP BY p.id`, [ids, segment, at]);
    return rows.map(promotion);
  }
  async getPrice(id: string) { const { rows } = await this.pool.query('SELECT * FROM prices WHERE id=$1', [id]); return rows[0] ? price(rows[0]) : null; }
  async listPriceChanges(id: string) { const { rows } = await this.pool.query('SELECT * FROM price_changes WHERE price_id=$1 ORDER BY changed_at DESC', [id]); return rows.map(change); }
  async createPrice(input: PriceInput & { actor_user_id: string }) { const c = await this.pool.connect(); try { await c.query('BEGIN'); const { rows } = await c.query('INSERT INTO prices(presentation_id,segmento,importe,vigente_desde,vigente_hasta,activo) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[input.presentation_id,input.segmento,input.importe,input.vigente_desde,input.vigente_hasta,input.activo]); await c.query('INSERT INTO price_changes(price_id,importe_anterior,importe_nuevo,actor_user_id) VALUES($1,NULL,$2,$3)',[rows[0].id,rows[0].importe,input.actor_user_id]); await c.query('COMMIT'); return price(rows[0]); } catch(e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); } }
  async updatePrice(id: string, input: Partial<PriceInput> & { actor_user_id: string }) {
    return this.transaction(async (client) => {
      const { rows: current } = await client.query('SELECT * FROM prices WHERE id=$1 FOR UPDATE', [id]);
      if (!current[0]) return null;
      const old = price(current[0]);
      const { rows } = await client.query(
        'UPDATE prices SET presentation_id=$2,segmento=$3,importe=$4,vigente_desde=$5,vigente_hasta=$6,activo=$7 WHERE id=$1 RETURNING *',
        [id,input.presentation_id??old.presentation_id,input.segmento??old.segmento,input.importe??old.importe,input.vigente_desde??old.vigente_desde,input.vigente_hasta===undefined?old.vigente_hasta:input.vigente_hasta,input.activo??old.activo],
      );
      await client.query('INSERT INTO price_changes(price_id,importe_anterior,importe_nuevo,actor_user_id) VALUES($1,$2,$3,$4)', [id,old.importe,rows[0].importe,input.actor_user_id]);
      return price(rows[0]);
    });
  }
  async deactivatePrice(id: string, actor: string) {
    return this.transaction(async (client) => {
      const { rows: current } = await client.query('SELECT * FROM prices WHERE id=$1 FOR UPDATE', [id]);
      if (!current[0]) return null;
      const old = price(current[0]);
      const { rows } = await client.query('UPDATE prices SET activo=false WHERE id=$1 RETURNING *', [id]);
      await client.query('INSERT INTO price_changes(price_id,importe_anterior,importe_nuevo,actor_user_id) VALUES($1,$2,$2,$3)', [id,old.importe,actor]);
      return price(rows[0]);
    });
  }
  async listPromotions() { const { rows }=await this.pool.query('SELECT p.*,COALESCE(array_agg(pp.presentation_id::text) FILTER(WHERE pp.presentation_id IS NOT NULL),ARRAY[]::text[]) presentation_ids FROM promotions p LEFT JOIN promotion_presentations pp ON pp.promotion_id=p.id GROUP BY p.id ORDER BY p.vigente_desde DESC'); return rows.map(promotion); }
  async getPromotion(id:string) { const {rows}=await this.pool.query('SELECT p.*,COALESCE(array_agg(pp.presentation_id::text) FILTER(WHERE pp.presentation_id IS NOT NULL),ARRAY[]::text[]) presentation_ids FROM promotions p LEFT JOIN promotion_presentations pp ON pp.promotion_id=p.id WHERE p.id=$1 GROUP BY p.id',[id]); return rows[0]?promotion(rows[0]):null; }
  async listPromotionChanges(id:string) { const {rows}=await this.pool.query('SELECT * FROM promotion_changes WHERE promotion_id=$1 ORDER BY changed_at DESC',[id]); return rows.map(r=>({...r,accion:r.accion,actor_user_id:r.actor_user_id,cambiado_en:r.changed_at,datos_anteriores:r.old_data,datos_nuevos:r.new_data})); }
  async createPromotion(input: PromotionInput & {actor_user_id:string}) { const c=await this.pool.connect(); try { await c.query('BEGIN'); const {rows}=await c.query('INSERT INTO promotions(nombre,segmento,tipo_descuento,valor_descuento,vigente_desde,vigente_hasta,activo) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[input.nombre,input.segmento,input.tipo_descuento,input.valor_descuento,input.vigente_desde,input.vigente_hasta,input.activo]); for(const id of input.presentation_ids as string[]) await c.query('INSERT INTO promotion_presentations(promotion_id,presentation_id) VALUES($1,$2)',[rows[0].id,id]); await c.query("INSERT INTO promotion_changes(promotion_id,accion,actor_user_id,new_data) VALUES($1,'CREATED',$2,$3)",[rows[0].id,input.actor_user_id,input]); await c.query('COMMIT'); return {...promotion(rows[0]),presentation_ids:input.presentation_ids as string[]}; } catch(e){await c.query('ROLLBACK');throw e;} finally{c.release();} }
  async updatePromotion(id: string, input: Partial<PromotionInput> & { actor_user_id: string }) {
    return this.transaction(async (client) => {
      const { rows: current } = await client.query('SELECT p.*,COALESCE(array_agg(pp.presentation_id::text) FILTER(WHERE pp.presentation_id IS NOT NULL),ARRAY[]::text[]) presentation_ids FROM promotions p LEFT JOIN promotion_presentations pp ON pp.promotion_id=p.id WHERE p.id=$1 GROUP BY p.id FOR UPDATE OF p', [id]);
      if (!current[0]) return null;
      const old = promotion(current[0]);
      const { rows } = await client.query(
        'UPDATE promotions SET nombre=$2,segmento=$3,tipo_descuento=$4,valor_descuento=$5,vigente_desde=$6,vigente_hasta=$7,activo=$8 WHERE id=$1 RETURNING *',
        [id,input.nombre??old.nombre,input.segmento??old.segmento,input.tipo_descuento??old.tipo_descuento,input.valor_descuento??old.valor_descuento,input.vigente_desde??old.vigente_desde,input.vigente_hasta??old.vigente_hasta,input.activo??old.activo],
      );
      await client.query('DELETE FROM promotion_presentations WHERE promotion_id=$1', [id]);
      const presentationIds = (input.presentation_ids ?? old.presentation_ids) as string[];
      for (const presentationId of presentationIds) await client.query('INSERT INTO promotion_presentations(promotion_id,presentation_id) VALUES($1,$2)', [id,presentationId]);
      await client.query("INSERT INTO promotion_changes(promotion_id,accion,actor_user_id,old_data,new_data) VALUES($1,'UPDATED',$2,$3,$4)", [id,input.actor_user_id,old,input]);
      return { ...promotion(rows[0]), presentation_ids: presentationIds };
    });
  }
  async deactivatePromotion(id: string, actor: string) {
    return this.transaction(async (client) => {
      const { rows: current } = await client.query('SELECT p.*,COALESCE(array_agg(pp.presentation_id::text) FILTER(WHERE pp.presentation_id IS NOT NULL),ARRAY[]::text[]) presentation_ids FROM promotions p LEFT JOIN promotion_presentations pp ON pp.promotion_id=p.id WHERE p.id=$1 GROUP BY p.id FOR UPDATE OF p', [id]);
      if (!current[0]) return null;
      const old = promotion(current[0]);
      const { rows } = await client.query('UPDATE promotions SET activo=false WHERE id=$1 RETURNING *', [id]);
      await client.query("INSERT INTO promotion_changes(promotion_id,accion,actor_user_id,old_data,new_data) VALUES($1,'DEACTIVATED',$2,$3,'{}')", [id,actor,old]);
      return { ...promotion(rows[0]), presentation_ids: old.presentation_ids };
    });
  }

  private async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
const price=(r:any):PriceRecord=>({id:r.id,presentation_id:r.presentation_id,segmento:r.segmento,importe:String(r.importe),vigente_desde:r.vigente_desde,vigente_hasta:r.vigente_hasta,activo:r.activo});
const promotion=(r:any):PromotionRecord=>({id:r.id,nombre:r.nombre,segmento:r.segmento,tipo_descuento:r.tipo_descuento,valor_descuento:String(r.valor_descuento),vigente_desde:r.vigente_desde,vigente_hasta:r.vigente_hasta,activo:r.activo,presentation_ids:r.presentation_ids??[]});
const change=(r:any):PriceChangeRecord=>({id:r.id,price_id:r.price_id,importe_anterior:r.importe_anterior===null?null:String(r.importe_anterior),importe_nuevo:String(r.importe_nuevo),actor_user_id:r.actor_user_id,cambiado_en:r.changed_at});
