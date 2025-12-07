import React from 'react';
import Head from 'next/head';
import MainPage from '../components/MainPage';

export default function Home() {
  return (
    <div>
      <Head>
        <title>AI Voice Agent Configuration Platform</title>
        <meta name="description" content="Configure your AI voice agent for lead qualification, service intake, and more." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <MainPage />
      </main>

      <footer className="mt-8 py-6 border-t text-center text-gray-500 text-sm">
        <p>AI Voice Agent Configuration Platform - Token-Optimized with Kani Memory Management</p>
      </footer>
    </div>
  );
} 