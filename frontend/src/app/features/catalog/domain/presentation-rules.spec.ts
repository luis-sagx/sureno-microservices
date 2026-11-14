import { describe, expect, it } from 'vitest';
import { Presentation } from '../models/catalog.models';
import { getAllowedPresentations, selectPresentation } from './presentation-rules';

const unit: Presentation = { id: 'unit', tipo: 'UNIDAD', unidades_por_presentacion: 1, activo: true };
const casePack: Presentation = { id: 'case', tipo: 'CAJA', unidades_por_presentacion: 12, activo: true };
const inactiveCase: Presentation = { ...casePack, id: 'inactive-case', activo: false };

describe('catalog presentation rules', () => {
  it('offers only active case presentations to approved businesses', () => {
    expect(getAllowedPresentations([unit, casePack, inactiveCase], true)).toEqual([casePack]);
  });

  it('offers every active presentation to other customers', () => {
    expect(getAllowedPresentations([unit, casePack, inactiveCase], false)).toEqual([unit, casePack]);
  });

  it('selects the requested type, then the profile default, then the first allowed option', () => {
    expect(selectPresentation([unit, casePack], 'CAJA', 'UNIDAD')).toBe(casePack);
    expect(selectPresentation([unit, casePack], undefined, 'UNIDAD')).toBe(unit);
    expect(selectPresentation([casePack], undefined, 'UNIDAD')).toBe(casePack);
    expect(selectPresentation([], undefined, 'UNIDAD')).toBeUndefined();
  });
});
