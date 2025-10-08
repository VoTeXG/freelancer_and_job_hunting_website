// Global JSX fallback to prevent TS2503 in certain build graphs
import type React from 'react';
declare global {
  namespace JSX {
    // Allow React nodes as elements
    interface Element extends React.ReactNode {}
  }
}
export {};
