import React, { ReactNode, MouseEvent } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: (e: MouseEvent<HTMLDivElement>) => void;
}

interface CardSectionProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 ${
        hover ? 'card-hover cursor-pointer' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: CardSectionProps) {
  return <div className={`px-6 py-4 border-b border-gray-100 dark:border-gray-700 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }: CardSectionProps) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: CardSectionProps) {
  return (
    <div className={`px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-xl ${className}`}>
      {children}
    </div>
  );
}
