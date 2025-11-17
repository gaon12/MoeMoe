import type React from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../../contexts/AppContext';
import { getFormattedTimeParts, getFullDateString } from '../../utils/time';
import './Clock.css';

interface ClockProps {
  className?: string;
  currentTime: Date;
}

export const Clock: React.FC<ClockProps> = ({ className = '', currentTime }) => {
  const { i18n } = useTranslation();
  const { settings } = useApp();

  const { time, ampmText, ampmPosition } = getFormattedTimeParts(currentTime, settings, i18n.language);
  const formattedDate = getFullDateString(currentTime, i18n.language);

  return (
    <div className={`clock-container ${className}`}>
      <div className="clock-time">
        {ampmText && ampmPosition === 'before' ? (
          <>
            <span className="ampm" aria-hidden="true">
              {ampmText}
            </span>{' '}
          </>
        ) : null}
        {time}
        {ampmText && ampmPosition === 'after' ? (
          <>
            {' '}
            <span className="ampm" aria-hidden="true">
              {ampmText}
            </span>
          </>
        ) : null}
      </div>
      <div className="clock-date">{formattedDate}</div>
    </div>
  );
};
