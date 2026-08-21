import { describe, expect, it, vi } from 'vitest';

const create = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class AuthenticationError extends Error {}
  class MockAnthropic {
    messages = { create };
    static AuthenticationError = AuthenticationError;
  }
  return { default: MockAnthropic };
});

const { extraerListadoDeTicket } = await import('./claudeVision');
const Anthropic = (await import('@anthropic-ai/sdk')).default as unknown as {
  AuthenticationError: new (message?: string) => Error;
};

describe('extraerListadoDeTicket', () => {
  it('devuelve el texto de la respuesta cuando la API responde bien', async () => {
    create.mockResolvedValueOnce({
      content: [{ type: 'text', text: '3 | Cuaderno | 25.50' }],
    });

    const resultado = await extraerListadoDeTicket('sk-ant-test', 'base64==', 'image/jpeg');
    expect(resultado).toEqual({ ok: true, texto: '3 | Cuaderno | 25.50' });
  });

  it('devuelve un mensaje específico cuando la clave no es válida', async () => {
    create.mockRejectedValueOnce(new Anthropic.AuthenticationError('invalid x-api-key'));

    const resultado = await extraerListadoDeTicket('sk-ant-mala', 'base64==', 'image/jpeg');
    expect(resultado).toEqual({ ok: false, error: 'La clave de API de Claude no es válida.' });
  });

  it('devuelve un mensaje genérico ante cualquier otro error', async () => {
    create.mockRejectedValueOnce(new Error('network down'));

    const resultado = await extraerListadoDeTicket('sk-ant-test', 'base64==', 'image/jpeg');
    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toContain('No se pudo procesar la foto');
  });

  it('devuelve error si la respuesta no trae ningún bloque de texto', async () => {
    create.mockResolvedValueOnce({ content: [] });

    const resultado = await extraerListadoDeTicket('sk-ant-test', 'base64==', 'image/jpeg');
    expect(resultado.ok).toBe(false);
  });
});
