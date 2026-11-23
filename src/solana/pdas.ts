import { address, type Address } from "@solana/kit";
import { PublicKey } from "@solana/web3.js";

import programa from "../config/programa.json";
import { s } from "./seeds";

const PROGRAM_ID = new PublicKey(programa.programId);

function derivar(semillas: Buffer[]): Address {
  const [pda] = PublicKey.findProgramAddressSync(semillas, PROGRAM_ID);
  return address(pda.toBase58());
}

// Rust: seeds = [b"biblioteca", autoridad.key().as_ref()]
export function pdaBiblioteca(autoridad: Address) {
  return derivar([s.texto("biblioteca"), s.cuenta(autoridad)]);
}

// Rust: seeds = [b"libro", biblioteca.key().as_ref(), codigo_isbn.as_bytes()]
export function pdaLibro(biblioteca: Address, codigoIsbn: string) {
  return derivar([s.texto("libro"), s.cuenta(biblioteca), s.texto(codigoIsbn)]);
}

export function cadena(autoridad: Address, codigoIsbn: string) {
  const biblioteca = pdaBiblioteca(autoridad);
  const libro = pdaLibro(biblioteca, codigoIsbn);
  return { biblioteca, libro };
}