import type { Address } from "@solana/kit";

import {
  fetchAllMaybeLibro,
  fetchMaybeBiblioteca,
  PRESTAMO_LIBROS_PROGRAM_ADDRESS,
} from "../../clients/js/src/generated";
import { rpc } from "./conexion";
import { pdaBiblioteca } from "./pdas";

export type LibroUI = {
  direccion: Address;
  codigoIsbn: string;
  titulo: string;
  prestado: boolean;
  prestatario: Address;
};

export type BibliotecaUI = {
  direccion: Address;
  nombre: string;
  totalLibros: number;
  libros: LibroUI[];
};

export async function leerBiblioteca(
  autoridad: Address
): Promise<BibliotecaUI | null> {
  const direccion = pdaBiblioteca(autoridad);
  const cuenta = await fetchMaybeBiblioteca(rpc, direccion);

  if (!cuenta.exists) return null;

  // Buscar todas las cuentas Libro que pertenecen a esta biblioteca (offset 8 = después del discriminador)
  const cuentasEncontradas = await rpc
    .getProgramAccounts(PRESTAMO_LIBROS_PROGRAM_ADDRESS, {
      encoding: "base64",
      filters: [
        {
          memcmp: {
            offset: 8n,
            bytes: direccion as unknown as string,
            encoding: "base58",
          },
        },
      ],
    })
    .send();

  const direccionesLibros = cuentasEncontradas.map((item) => item.pubkey);
  const librosDecodificados =
    direccionesLibros.length > 0
      ? await fetchAllMaybeLibro(rpc, direccionesLibros)
      : [];

  const libros: LibroUI[] = librosDecodificados
    .filter((l) => l.exists)
    .map((l) => ({
      direccion: l.address,
      codigoIsbn: l.data.codigoIsbn,
      titulo: l.data.titulo,
      prestado: l.data.prestado,
      prestatario: l.data.prestatario,
    }));

  return {
    direccion,
    nombre: cuenta.data.nombre,
    totalLibros: Number(cuenta.data.totalLibros),
    libros,
  };
}