import { address, createNoopSigner, type Address } from '@solana/kit';
import type { Connection } from '@solana/web3.js';
import {
  getInicializarBibliotecaInstruction,
  getRegistrarLibroInstruction,
  getPrestarLibroInstruction,
  getDevolverLibroInstruction,
  getEliminarLibroInstruction,
} from '../../clients/js/src/generated';
import { cadena, pdaBiblioteca } from './pdas';
import { enviar, type WalletFirma, type OpcionesEnvio } from './tx';
import { comprobarConfiguracion } from './seguridad';
import { bibliotecaValida, direccionValida, isbnValido, tituloValido } from './validaciones';

export function direccionDe(wallet: Pick<WalletFirma, 'publicKey'>): Address {
  if (!wallet.publicKey) throw new Error('Conecta tu wallet primero.');
  return address(wallet.publicKey.toBase58());
}

function firmante(wallet: WalletFirma) {
  comprobarConfiguracion();
  return createNoopSigner(direccionDe(wallet));
}

export async function inicializarBiblioteca(
  wallet: WalletFirma,
  connection: Connection,
  nombre: string,
  opciones?: OpcionesEnvio
): Promise<string> {
  nombre = bibliotecaValida(nombre);
  const autoridad = firmante(wallet);
  const biblioteca = pdaBiblioteca(autoridad.address);
  const ix = getInicializarBibliotecaInstruction({ autoridad, biblioteca, nombre });
  return enviar(ix, wallet, connection, opciones);
}

export async function registrarLibro(
  wallet: WalletFirma,
  connection: Connection,
  codigoIsbn: string,
  titulo: string,
  opciones?: OpcionesEnvio
): Promise<string> {
  codigoIsbn = isbnValido(codigoIsbn);
  titulo = tituloValido(titulo);
  const autoridad = firmante(wallet);
  const { biblioteca, libro } = cadena(autoridad.address, codigoIsbn);
  const ix = getRegistrarLibroInstruction({ autoridad, biblioteca, libro, codigoIsbn, titulo });
  return enviar(ix, wallet, connection, opciones);
}

export async function prestarLibro(
  wallet: WalletFirma,
  connection: Connection,
  codigoIsbn: string,
  usuarioPrestatarioTexto: string,
  opciones?: OpcionesEnvio
): Promise<string> {
  codigoIsbn = isbnValido(codigoIsbn);
  const usuarioPrestatario = direccionValida(usuarioPrestatarioTexto, 'La dirección del prestatario');
  const autoridad = firmante(wallet);
  const { biblioteca, libro } = cadena(autoridad.address, codigoIsbn);
  const ix = getPrestarLibroInstruction({ autoridad, biblioteca, libro, usuarioPrestatario });
  return enviar(ix, wallet, connection, opciones);
}

export async function devolverLibro(
  wallet: WalletFirma,
  connection: Connection,
  codigoIsbn: string,
  opciones?: OpcionesEnvio
): Promise<string> {
  codigoIsbn = isbnValido(codigoIsbn);
  const autoridad = firmante(wallet);
  const { biblioteca, libro } = cadena(autoridad.address, codigoIsbn);
  const ix = getDevolverLibroInstruction({ autoridad, biblioteca, libro });
  return enviar(ix, wallet, connection, opciones);
}

export async function eliminarLibro(
  wallet: WalletFirma,
  connection: Connection,
  codigoIsbn: string,
  opciones?: OpcionesEnvio
): Promise<string> {
  codigoIsbn = isbnValido(codigoIsbn);
  const autoridad = firmante(wallet);
  const { biblioteca, libro } = cadena(autoridad.address, codigoIsbn);
  const ix = getEliminarLibroInstruction({ autoridad, biblioteca, libro });
  return enviar(ix, wallet, connection, opciones);
}