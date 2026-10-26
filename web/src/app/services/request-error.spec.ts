import { describe, expect, it } from 'vitest';
import { getRequestErrorMessage } from './request-error';

describe('getRequestErrorMessage', () => {
  it('prefers a backend detail over the transport error message', () => {
    const error = {
      response: { data: { detail: 'Service unavailable' } },
      message: 'Request failed'
    };

    expect(getRequestErrorMessage(error, 'detail', 'Fallback')).toBe('Service unavailable');
  });

  it('uses an error message when the backend detail is missing or empty', () => {
    expect(
      getRequestErrorMessage(
        { response: { data: { message: '' } }, message: 'Network unavailable' },
        'message',
        'Fallback'
      )
    ).toBe('Network unavailable');
  });

  it('returns the fallback for null, primitive, and uninformative errors', () => {
    expect(getRequestErrorMessage(null, 'message', 'Fallback')).toBe('Fallback');
    expect(getRequestErrorMessage('failure', 'message', 'Fallback')).toBe('Fallback');
    expect(getRequestErrorMessage({ message: '' }, 'message', 'Fallback')).toBe('Fallback');
  });
});
