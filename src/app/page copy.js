

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-800">Welcome to MyFinance</h1>
        <p className="text-xl text-gray-600 mt-4">Track your spending, get insights, and predict your future expenses!</p>
      </header>
     
      <section className="flex justify-center space-x-4">
  <Link href="/register" className="bg-blue-500 text-white px-6 py-3 rounded-lg">
    Sign Up
  </Link>
  <Link href="/login" className="bg-green-500 text-white px-6 py-3 rounded-lg ml-4">
    Log In
  </Link>
</section>


      <section className="mt-16 text-center">
        <h2 className="text-2xl font-semibold text-gray-800">Features Overview</h2>
        <ul className="list-disc text-lg text-gray-600 mt-4">
          <li>Track your income and expenses easily</li>
        </ul>
      </section>
    </div>
  );
}
