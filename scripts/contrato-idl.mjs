import { createHash } from 'node:crypto';
import { PublicKey } from '@solana/web3.js';

export const REFERENCIA_ID = '38oTMyvUTmqkBQeMiuok5F2mPjp9dVadWdBeQTDNmTUY';

export function validarIdl(idl, programIdOpcional) {
  if (!idl || typeof idl !== 'object' || !Array.isArray(idl.instructions)) {
    throw new Error('El archivo no tiene la estructura de un IDL de Anchor.');
  }

  const direccion = programIdOpcional ?? idl.address ?? idl.metadata?.address;
  if (!direccion) {
    throw new Error('El IDL no incluye direccion. Agrega --program-id TU_PROGRAM_ID o ponla en el idl.json.');
  }

  let programId;
  try {
    programId = new PublicKey(direccion).toBase58();
  } catch {
    throw new Error('El Program ID no es una direccion valida de Solana.');
  }

  if (programId === '11111111111111111111111111111111') {
    throw new Error('El System Program no es el programa valido. Usa el ID de tu despliegue.');
  }

  if (
    programIdOpcional &&
    (idl.address ?? idl.metadata?.address) &&
    programId !== (idl.address ?? idl.metadata?.address)
  ) {
    throw new Error('El --program-id y la direccion del IDL no coinciden. Exporta el IDL correcto.');
  }

  return { programId, esReferencia: programId === REFERENCIA_ID };
}

export function prepararIdl(idl, programId) {
  const copia = structuredClone(idl);
  if (copia.address) copia.address = programId;
  else copia.metadata = { ...copia.metadata, address: programId };

  for (const instruccion of copia.instructions) {
    for (const argumento of instruccion.args ?? []) {
      argumento.name = argumento.name.replace(/^_+/, '');
    }
  }
  return copia;
}

export function huellaIdl(idl) {
  return createHash('sha256').update(JSON.stringify(idl)).digest('hex');
}