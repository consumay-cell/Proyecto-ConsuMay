import { address, type Address } from '@solana/kit';

export function texto(valor: string, etiqueta: string, maxBytes: number): string {
  const limpio = valor.trim();
  if (!limpio) throw new Error(etiqueta + ' es obligatorio.');
  if (new TextEncoder().encode(limpio).length > maxBytes) {
    throw new Error(etiqueta + ' admite hasta ' + maxBytes + ' bytes UTF-8.');
  }
  return limpio;
}

export function direccionValida(valor: string, etiqueta: string): Address {
  const limpio = valor.trim();
  if (!limpio) throw new Error(etiqueta + ' es obligatoria.');
  try {
    return address(limpio);
  } catch {
    throw new Error(etiqueta + ' no es una dirección pública válida de Solana.');
  }
}

export const bibliotecaValida = (valor: string) => texto(valor, 'El nombre de la biblioteca', 50);
export const isbnValido = (valor: string) => texto(valor, 'El código ISBN', 20);
export const tituloValido = (valor: string) => texto(valor, 'El título del libro', 60);