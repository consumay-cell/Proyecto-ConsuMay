import { useEffect, useRef, useState } from 'react';
import { address } from '@solana/kit';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import programa from '../config/programa.json';
import { leerBiblioteca, type BibliotecaUI } from '../solana/lecturas';
import { ErrorTransaccion, ErrorConfirmacionPendiente, enlaceTransaccion, traducir, type OpcionesEnvio } from '../solana/tx';
import {
  inicializarBiblioteca,
  registrarLibro,
  prestarLibro,
  devolverLibro,
  eliminarLibro,
} from '../solana/acciones';

type Operacion = 'biblioteca' | 'registrar' | 'prestar' | 'devolver' | 'eliminar';

const operaciones: { id: Operacion; texto: string }[] = [
  { id: 'biblioteca', texto: 'Crear biblioteca' },
  { id: 'registrar', texto: 'Registrar libro' },
  { id: 'prestar', texto: 'Prestar libro' },
  { id: 'devolver', texto: 'Devolver libro' },
  { id: 'eliminar', texto: 'Eliminar libro' },
];

export function Registro({ onCambio, onOcupado }: { onCambio: () => void; onOcupado: (valor: boolean) => void }) {
  const wallet = useWallet();
  const { connection } = useConnection();
  const walletDireccion = wallet.publicKey?.toBase58() ?? '';

  const [autoridad, setAutoridad] = useState(walletDireccion);
  const [biblioteca, setBiblioteca] = useState<BibliotecaUI | null>(null);
  const [consultado, setConsultado] = useState(false);
  const [leyendo, setLeyendo] = useState(false);
  const [errorLectura, setErrorLectura] = useState('');

  const [op, setOp] = useState<Operacion>('biblioteca');
  const [nombreBiblioteca, setNombreBiblioteca] = useState('Biblioteca Central');
  const [codigoIsbn, setCodigoIsbn] = useState('978-8437604947');
  const [titulo, setTitulo] = useState('Pedro Páramo');
  const [prestatario, setPrestatario] = useState('');

  const [ocupado, setOcupado] = useState(false);
  const [fase, setFase] = useState('');
  const [firma, setFirma] = useState('');
  const [firmaFallida, setFirmaFallida] = useState('');
  const [errorOperacion, setErrorOperacion] = useState('');
  const [aviso, setAviso] = useState('');

  const contexto = useRef('');
  const secuencia = useRef(0);
  contexto.current = autoridad;

  useEffect(() => {
    setAutoridad(walletDireccion);
    if (walletDireccion && !prestatario) setPrestatario(walletDireccion);
  }, [walletDireccion]);

  useEffect(() => {
    secuencia.current += 1;
    setBiblioteca(null);
    setConsultado(false);
    setErrorLectura('');
    setLeyendo(false);
    setFirma('');
    setFirmaFallida('');
    setErrorOperacion('');
    setAviso('');
  }, [autoridad]);

  useEffect(() => {
    onOcupado(ocupado);
    return () => onOcupado(false);
  }, [ocupado, onOcupado]);

  async function cargar(owner = autoridad) {
    const turno = ++secuencia.current;
    setLeyendo(true);
    setErrorLectura('');
    try {
      const datos = await leerBiblioteca(address(owner.trim()));
      if (turno === secuencia.current && contexto.current === owner) {
        setBiblioteca(datos);
        setConsultado(true);
      }
    } catch (error) {
      if (turno === secuencia.current) setErrorLectura(traducir(error));
      throw error;
    } finally {
      if (turno === secuencia.current) setLeyendo(false);
    }
  }

  async function ejecutar(evento: React.FormEvent) {
    evento.preventDefault();
    setOcupado(true);
    setFase('Preparando operación…');
    setFirma('');
    setFirmaFallida('');
    setErrorOperacion('');
    setAviso('');

    const direccionWallet = walletDireccion;
    const opciones: OpcionesEnvio = {
      onEstado: (estado) =>
        setFase(estado === 'firma' ? 'Revisa la solicitud en tu wallet…' : 'Esperando confirmación de la red…'),
    };

    try {
      let resultado: string;
      switch (op) {
        case 'biblioteca':
          resultado = await inicializarBiblioteca(wallet, connection, nombreBiblioteca, opciones);
          break;
        case 'registrar':
          resultado = await registrarLibro(wallet, connection, codigoIsbn, titulo, opciones);
          break;
        case 'prestar':
          resultado = await prestarLibro(wallet, connection, codigoIsbn, prestatario, opciones);
          break;
        case 'devolver':
          resultado = await devolverLibro(wallet, connection, codigoIsbn, opciones);
          break;
        case 'eliminar':
          resultado = await eliminarLibro(wallet, connection, codigoIsbn, opciones);
          break;
      }
      setFirma(resultado);
      setFase('Operación confirmada correctamente.');
      onCambio();
      try {
        await cargar(direccionWallet);
      } catch {
        setAviso('La operación se confirmó, pero no pudimos actualizar los datos. Pulsa Consultar biblioteca.');
      }
    } catch (error) {
      setFase('');
      setErrorOperacion(traducir(error));
      if (error instanceof ErrorTransaccion || error instanceof ErrorConfirmacionPendiente) {
        setFirmaFallida(error.firma);
      }
    } finally {
      setOcupado(false);
    }
  }

  const esOtraAutoridad = !!autoridad.trim() && autoridad.trim() !== walletDireccion;
  const permiteEscribir = !programa.esReferencia && !!wallet.publicKey && !esOtraAutoridad;

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="eyebrow">BIBLIOTECA · CATÁLOGO · PRÉSTAMOS</p>
          <h2>Sistema de Préstamo de Libros</h2>
        </div>
        <span className="tag">Solana Devnet</span>
      </div>

      <section className="panel lookup-panel">
        <div className="panel-heading">
          <h3>Localizar la biblioteca</h3>
          <span className="small-note">Lectura sin firma</span>
        </div>
        <div className="lookup-fields">
          <label>
            Dirección de la autoridad (bibliotecario)
            <input
              value={autoridad}
              disabled={ocupado}
              onChange={(e) => setAutoridad(e.target.value)}
              placeholder="Conecta tu wallet o pega una dirección pública"
              spellCheck={false}
              autoComplete="off"
            />
          </label>
          <button
            className="button secondary"
            disabled={leyendo || ocupado || !autoridad.trim()}
            onClick={() => void cargar().catch(() => {})}
          >
            {leyendo ? 'Consultando…' : 'Consultar biblioteca'}
          </button>
        </div>
        <p className="help">Cada wallet administra su propia cuenta PDA de biblioteca.</p>
        {errorLectura && (
          <p className="notice error" role="alert">
            {errorLectura}
          </p>
        )}
      </section>

      <div className="workspace-grid">
        <section className="panel customers-panel">
          <div className="panel-heading">
            <h3>Catálogo y estado de préstamos</h3>
            {biblioteca && <span className="count">{biblioteca.libros.length} libros</span>}
          </div>

          {!biblioteca ? (
            <div className="empty-state">
              <span className="empty-symbol">◎</span>
              <h4>{consultado ? 'La biblioteca todavía no existe' : 'Tu biblioteca aparecerá aquí'}</h4>
              <p>
                {consultado
                  ? 'Crea tu biblioteca desde el panel de Operaciones usando tu wallet conectada.'
                  : 'Pulsa Consultar biblioteca para ver los libros registrados y su disponibilidad.'}
              </p>
            </div>
          ) : (
            <>
              <div className="registry-summary">
                <div>
                  <span className="label">Biblioteca</span>
                  <strong>{biblioteca.nombre}</strong>
                </div>
                <div>
                  <span className="label">Total registrados</span>
                  <strong>{biblioteca.totalLibros}</strong>
                </div>
              </div>
              <details className="technical-details">
                <summary>Dirección PDA de la biblioteca</summary>
                <code className="address">{biblioteca.direccion}</code>
              </details>

              {biblioteca.libros.length === 0 ? (
                <p className="empty-line">Todavía no hay libros. Registra el primero desde Operaciones.</p>
              ) : (
                biblioteca.libros.map((libro) => (
                  <article className="customer" key={libro.direccion}>
                    <header>
                      <div>
                        <strong>{libro.titulo}</strong>
                        <span className="small-note"> · ISBN: {libro.codigoIsbn}</span>
                      </div>
                      <span className="tag">{libro.prestado ? 'PRESTADO' : 'DISPONIBLE'}</span>
                    </header>
                    {libro.prestado && (
                      <p className="small-note">
                        Prestatario: <code>{libro.prestatario}</code>
                      </p>
                    )}
                    <details className="technical-details">
                      <summary>Cuenta PDA del libro</summary>
                      <code className="address">{libro.direccion}</code>
                    </details>
                  </article>
                ))
              )}
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <h3>Operaciones</h3>
            <span className="small-note">Requiere firma</span>
          </div>

          <div className="operation-tabs" role="tablist" aria-label="Operaciones">
            {operaciones.map((item) => (
              <button
                key={item.id}
                type="button"
                className={op === item.id ? 'tab selected' : 'tab'}
                disabled={ocupado}
                onClick={() => setOp(item.id)}
              >
                {item.texto}
              </button>
            ))}
          </div>
<form onSubmit={(e) => void ejecutar(e)} className="operation-form">
            {op === 'biblioteca' && (
              <label>
                Nombre de la biblioteca
                <input
                  value={nombreBiblioteca}
                  disabled={ocupado}
                  onChange={(e) => setNombreBiblioteca(e.target.value)}
                  placeholder="Biblioteca Central"
                />
              </label>
            )}

            {op !== 'biblioteca' && (
              <label>
                Código ISBN
                <input
                  value={codigoIsbn}
                  disabled={ocupado}
                  onChange={(e) => setCodigoIsbn(e.target.value)}
                  placeholder="978-8437604947"
                />
              </label>
            )}

            {op === 'registrar' && (
              <label>
                Título del libro
                <input
                  value={titulo}
                  disabled={ocupado}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Pedro Páramo"
                />
              </label>
            )}

            {op === 'prestar' && (
              <label>
                Wallet del usuario prestatario
                <input
                  value={prestatario}
                  disabled={ocupado}
                  onChange={(e) => setPrestatario(e.target.value)}
                  placeholder="Dirección pública de Solana"
                  spellCheck={false}
                />
              </label>
            )}

            <button className="button primary" type="submit" disabled={!permiteEscribir || ocupado}>
              {ocupado ? 'Procesando…' : operaciones.find((o) => o.id === op)?.texto}
            </button>

            {!wallet.publicKey && <p className="help">Conecta tu wallet en Devnet para firmar transacciones.</p>}
            {esOtraAutoridad && (
              <p className="help">Estás consultando la biblioteca de otra autoridad (modo solo lectura).</p>
            )}
          </form>

          {fase && <p className="notice information">{fase}</p>}
          {aviso && <p className="notice information">{aviso}</p>}
          {errorOperacion && (
            <p className="notice error" role="alert">
              {errorOperacion}
              {firmaFallida && (
                <>
                  {' '}
                  <a href={enlaceTransaccion(firmaFallida)} target="_blank" rel="noreferrer">
                    Ver en Explorer
                  </a>
                </>
              )}
            </p>
          )}
          {firma && (
            <p className="notice success">
              Transacción confirmada:{' '}
              <a href={enlaceTransaccion(firma)} target="_blank" rel="noreferrer">
                {firma.slice(0, 12)}…
              </a>
            </p>
          )}
        </section>
      </div>
    </>
  );
}