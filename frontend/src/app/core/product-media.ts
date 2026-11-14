import { Product, Presentation } from './api';

const productImageFiles: Record<string, string> = {
  'Aguardiente Diamante': 'aguardiente-diamante',
  'Blue Vodka': 'vodka-blue',
  'Media Caña Sureña': 'cana-surena-media',
  'Caña Sureña': 'cana-surena',
  'Cocktail Sabor a Durazno': 'coctel-durazno',
  'Cocktail Sabor a Maracuyá': 'coctel-maracuya',
  'Licor de Cannabis': 'cannabis',
  'Media Ron Oro': 'licor-oro-media',
  'Ron Oro': 'licor-oro',
  'Vodka Seco Glacial': 'vodka-glacial',
  'Whisky Red Diez': 'wisky-red-diez',
};

export function productImagePath(
  product: Pick<Product, 'nombre'>,
  presentation?: Pick<Presentation, 'tipo'>,
): string {
  const file = productImageFiles[product.nombre];
  if (!file) return '/logo-isotipo.png';
  return presentation?.tipo === 'CAJA'
    ? `/img-mayoreo/caja-${file}.webp`
    : `/img-minorista/${file}.webp`;
}
