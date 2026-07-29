import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AudioLabFoundation, { AUDIO_LAB_MAX_FILE_BYTES } from './AudioLabFoundation';

const createObjectURL = vi.fn(() => 'blob:nova-local-audio');
const revokeObjectURL = vi.fn();

beforeEach(() => {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: createObjectURL });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revokeObjectURL });
});

afterEach(() => {
  cleanup();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
});

describe('AudioLabFoundation', () => {
  it('states the analysis boundary without fabricating results', () => {
    render(<AudioLabFoundation lang="en" />);

    expect(screen.getByRole('heading', { name: 'Inspect a local audio file' })).toBeInTheDocument();
    expect(screen.getByTestId('audio-analysis-boundary')).toHaveTextContent('No audio has been analyzed');
    expect(screen.getAllByText('Not run')).toHaveLength(4);
    expect(screen.queryByText(/120 BPM/i)).not.toBeInTheDocument();
  });

  it('previews a valid local file and reports only browser metadata', async () => {
    const user = userEvent.setup();
    render(<AudioLabFoundation lang="es" />);
    const input = screen.getByLabelText('Elegir audio');
    const file = new File([new Uint8Array([1, 2, 3])], 'demo.wav', { type: 'audio/wav' });

    await user.upload(input, file);

    expect(createObjectURL).toHaveBeenCalledWith(file);
    expect(screen.getByText('demo.wav')).toBeInTheDocument();
    expect(screen.getByText('audio/wav')).toBeInTheDocument();
    const preview = screen.getByLabelText('Preescucha de audio local');
    expect(preview).toHaveAttribute('src', 'blob:nova-local-audio');

    Object.defineProperty(preview, 'duration', { configurable: true, value: 125 });
    fireEvent.loadedMetadata(preview);
    expect(screen.getByText('2:05')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpiar archivo' }));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:nova-local-audio');
    expect(screen.queryByText('demo.wav')).not.toBeInTheDocument();
  });

  it('rejects oversized files before creating a preview URL', async () => {
    const user = userEvent.setup();
    render(<AudioLabFoundation lang="en" />);
    const file = new File([new Uint8Array([1])], 'too-large.flac', { type: 'audio/flac' });
    Object.defineProperty(file, 'size', { configurable: true, value: AUDIO_LAB_MAX_FILE_BYTES + 1 });

    await user.upload(screen.getByLabelText('Choose audio'), file);

    expect(createObjectURL).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('larger than the 100 MB safety limit');
  });

  it('rejects a preview URL that is not a browser blob URL', async () => {
    createObjectURL.mockReturnValueOnce('https://example.test/untrusted-audio');
    const user = userEvent.setup();
    render(<AudioLabFoundation lang="en" />);
    const file = new File([new Uint8Array([1])], 'local.wav', { type: 'audio/wav' });

    await user.upload(screen.getByLabelText('Choose audio'), file);

    expect(revokeObjectURL).toHaveBeenCalledWith('https://example.test/untrusted-audio');
    expect(screen.queryByLabelText('Local audio preview')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('could not read this file');
  });

  it('uses RTL Hebrew and releases the preview URL on unmount', async () => {
    const user = userEvent.setup();
    const view = render(<AudioLabFoundation lang="he" />);
    const file = new File([new Uint8Array([1])], 'local.ogg', { type: 'audio/ogg' });

    expect(screen.getByRole('region')).toHaveAttribute('dir', 'rtl');
    await user.upload(screen.getByLabelText('בחירת אודיו'), file);
    view.unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:nova-local-audio');
  });
});
