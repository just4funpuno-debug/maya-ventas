// Botón que evita multiclick mientras la promesa onClick está en curso.
// Props: onClick (async o sync), busyText, children, className, disabled, autoResetMs
import React from 'react';
import { useSingleAsyncAction } from '../hooks/useSingleAsyncAction';

export function AsyncButton({ onClick, busyText = 'Procesando...', children, className = '', disabled, autoResetMs = 0, ...rest }) {
  const { run, running } = useSingleAsyncAction(async () => {
    if (onClick) {
      await onClick();
    }
  }, { autoResetMs });

  return (
    <button
      type="button"
      onClick={run}
      disabled={disabled || running}
      className={className + (running ? ' opacity-70 cursor-not-allowed' : '')}
      {...rest}
    >
      {running ? busyText : children}
    </button>
  );
}
