'use client';

import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    // Rediriger automatiquement vers l'application pronostics
    window.location.href = '/pronostics-app/';
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      color: '#fff',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{ fontSize: '48px' }}>👑</div>
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#f97316' }}>
        Steo Élite - Pronostics
      </h1>
      <p style={{ color: '#888' }}>Redirection vers l'application de pronostics...</p>
      
      <a 
        href="/pronostics-app/"
        style={{
          marginTop: '20px',
          padding: '14px 28px',
          background: '#f97316',
          color: '#fff',
          borderRadius: '10px',
          textDecoration: 'none',
          fontWeight: 'bold',
          fontSize: '16px'
        }}
      >
        Accéder aux Pronostics →
      </a>
      
      <div style={{ 
        marginTop: '40px', 
        padding: '20px', 
        background: '#1a1a1a', 
        borderRadius: '12px',
        maxWidth: '400px',
        textAlign: 'center'
      }}>
        <p style={{ fontSize: '12px', color: '#555', marginBottom: '10px' }}>
          📊 Application de pronostics sportifs avec Machine Learning
        </p>
        <p style={{ fontSize: '11px', color: '#444' }}>
          Football • Basketball • NFL • NHL
        </p>
      </div>
    </div>
  );
}
