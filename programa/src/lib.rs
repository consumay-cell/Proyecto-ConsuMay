use anchor_lang::prelude::*;

declare_id!("DaowjZYrHSizT8mEeXpKTwvtSkjapPfkKDxdeZ63D7vN");

#[program]
pub mod prestamo_libros {
    use super::*;

    // Biblioteca
    pub fn inicializar_biblioteca(ctx: Context<InicializarBiblioteca>, nombre: String) -> Result<()> {
        require!(nombre.len() <= 50, ErrorBiblioteca::TextoMuyLargo);
        let biblioteca = &mut ctx.accounts.biblioteca;
        biblioteca.autoridad = ctx.accounts.autoridad.key();
        biblioteca.nombre = nombre;
        biblioteca.total_libros = 0;
        Ok(())
    }

    // Agrega un libro vinculado a la biblioteca
    pub fn registrar_libro(
        ctx: Context<RegistrarLibro>,
        codigo_isbn: String,
        titulo: String,
    ) -> Result<()> {
        require!(codigo_isbn.len() <= 20, ErrorBiblioteca::TextoMuyLargo);
        require!(titulo.len() <= 60, ErrorBiblioteca::TextoMuyLargo);

        let libro = &mut ctx.accounts.libro;
        let biblioteca = &mut ctx.accounts.biblioteca;

        libro.biblioteca = biblioteca.key();
        libro.codigo_isbn = codigo_isbn;
        libro.titulo = titulo;
        libro.prestado = false;
        libro.prestatario = Pubkey::default();

        biblioteca.total_libros = biblioteca.total_libros.checked_add(1).unwrap();
        Ok(())
    }

    //Presta un libro si está disponible
    pub fn prestar_libro(ctx: Context<ModificarLibro>, usuario_prestatario: Pubkey) -> Result<()> {
        let libro = &mut ctx.accounts.libro;
        
        // Validación de regla de negocio (rechazo si ya está prestado)
        require!(!libro.prestado, ErrorBiblioteca::LibroYaPrestado);

        libro.prestado = true;
        libro.prestatario = usuario_prestatario;
        Ok(())
    }

    // Marca el libro como devuelto
    pub fn devolver_libro(ctx: Context<ModificarLibro>) -> Result<()> {
        let libro = &mut ctx.accounts.libro;
        
        require!(libro.prestado, ErrorBiblioteca::LibroNoEstaPrestado);

        libro.prestado = false;
        libro.prestatario = Pubkey::default();
        Ok(())
    }

    // Elimina el libro y recupera la renta. Solo el dueño de la biblioteca puede cerrarlo y SOLO si no está prestado
    pub fn eliminar_libro(ctx: Context<EliminarLibro>) -> Result<()> {
        let libro = &ctx.accounts.libro;
        let biblioteca = &mut ctx.accounts.biblioteca;

        // Condición de cierre
        require!(!libro.prestado, ErrorBiblioteca::NoEliminarLibroPrestado);

        biblioteca.total_libros = biblioteca.total_libros.checked_sub(1).unwrap();
        Ok(())
    }
}

// validacion

#[derive(Accounts)]
pub struct InicializarBiblioteca<'info> {
    #[account(
        init,
        payer = autoridad,
        space = 8 + 32 + (4 + 50) + 8,
        seeds = [b"biblioteca", autoridad.key().as_ref()],
        bump
    )]
    pub biblioteca: Account<'info, Biblioteca>,
    #[account(mut)]
    pub autoridad: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(codigo_isbn: String)]
pub struct RegistrarLibro<'info> {
    #[account(
        mut,
        has_one = autoridad @ ErrorBiblioteca::NoAutorizado
    )]
    pub biblioteca: Account<'info, Biblioteca>,
    #[account(
        init,
        payer = autoridad,
        space = 8 + 32 + (4 + 20) + (4 + 60) + 1 + 32,
        seeds = [b"libro", biblioteca.key().as_ref(), codigo_isbn.as_bytes()],
        bump
    )]
    pub libro: Account<'info, Libro>,
    #[account(mut)]
    pub autoridad: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ModificarLibro<'info> {
    #[account(has_one = autoridad @ ErrorBiblioteca::NoAutorizado)]
    pub biblioteca: Account<'info, Biblioteca>,
    #[account(
        mut,
        has_one = biblioteca @ ErrorBiblioteca::LibroNoPertenece
    )]
    pub libro: Account<'info, Libro>,
    pub autoridad: Signer<'info>,
}

#[derive(Accounts)]
pub struct EliminarLibro<'info> {
    #[account(
        mut,
        has_one = autoridad @ ErrorBiblioteca::NoAutorizado
    )]
    pub biblioteca: Account<'info, Biblioteca>,
    #[account(
        mut,
        has_one = biblioteca @ ErrorBiblioteca::LibroNoPertenece,
        close = autoridad // Devuelve los lamports de renta a la autoridad
    )]
    pub libro: Account<'info, Libro>,
    #[account(mut)]
    pub autoridad: Signer<'info>,
}

// Datos

#[account]
pub struct Biblioteca {
    pub autoridad: Pubkey,
    pub nombre: String,
    pub total_libros: u64,
}

#[account]
pub struct Libro {
    pub biblioteca: Pubkey,
    pub codigo_isbn: String,
    pub titulo: String,
    pub prestado: bool,
    pub prestatario: Pubkey,
}

// Errores

#[error_code]
pub enum ErrorBiblioteca {
    #[msg("No tienes permisos de autoridad sobre esta biblioteca.")]
    NoAutorizado,
    #[msg("El libro no pertenece a esta biblioteca.")]
    LibroNoPertenece,
    #[msg("El libro ya se encuentra prestado actualmente.")]
    LibroYaPrestado,
    #[msg("El libro no está prestado, no se puede devolver.")]
    LibroNoEstaPrestado,
    #[msg("No puedes eliminar un libro mientras esté prestado.")]
    NoEliminarLibroPrestado,
    #[msg("El texto ingresado excede el límite de caracteres.")]
    TextoMuyLargo,
}