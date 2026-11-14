import { Presentation } from '../models/catalog.models';

export type PresentationType = Presentation['tipo'];

export function getAllowedPresentations(
  presentations: Presentation[],
  isApprovedBusiness: boolean,
): Presentation[] {
  const active = presentations.filter((presentation) => presentation.activo);
  return isApprovedBusiness ? active.filter((presentation) => presentation.tipo === 'CAJA') : active;
}

export function selectPresentation(
  allowed: Presentation[],
  requestedType: PresentationType | undefined,
  defaultType: PresentationType,
): Presentation | undefined {
  return allowed.find((presentation) => presentation.tipo === requestedType) ??
    allowed.find((presentation) => presentation.tipo === defaultType) ??
    allowed[0];
}
