import React, { useState, useEffect } from 'react';
import {
  Trash2,
  Zap,
  Skull,
  Siren,
  PartyPopper,
  AlertTriangle,
} from 'lucide-react';
import { motion } from 'framer-motion';

// --- Constants ---
const COMIC_SANS = "'Comic Sans MS', 'Comic Sans', cursive";

export const NoSubscriptionCode = () => {
  const [count, setCount] = useState(0);
  const [text, setText] = useState("DON'T CLICK ME");
  const [bgColor, setBgColor] = useState('#ffffff');

  useEffect(() => {
    const interval = setInterval(() => {
      setBgColor((prev) => (prev === '#ffff00' ? '#00ffff' : '#ffff00'));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleBadClick = () => {
    setCount((c) => c + Math.floor(Math.random() * 100) - 50);
    setText((prev) =>
      prev === 'WHY DID YOU CLICK?' ? 'I SAID STOP!' : 'WHY DID YOU CLICK?'
    );
  };

  const chaoticVariants = {
    animate: {
      x: [0, -10, 10, -5, 5, 0],
      y: [0, 5, -5, 2, -2, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: 'mirror' as const,
      },
    },
  };

  return (
    <div
      className="min-h-screen w-full p-4 overflow-hidden border-[20px] border-double border-red-600 relative"
      style={{
        fontFamily: COMIC_SANS,
        backgroundImage:
          'linear-gradient(45deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%)',
      }}
    >
      <div className="absolute top-0 left-0 w-full h-8 bg-black text-white overflow-hidden whitespace-nowrap z-50">
        <motion.div
          animate={{ x: ['100%', '-100%'] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          className="text-xl font-bold pt-1"
        >
          ⚠ WARNING: EXTREMELY HIGH QUALITY UI DETECTED ⚠ DO NOT LOOK
          DIRECTLY AT THE PIXELS ⚠
        </motion.div>
      </div>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Section 1: The Annoying Header */}
        <div className="bg-lime-300 p-8 border-8 border-dashed border-purple-600 rotate-2 hover:rotate-0 transition-all duration-300 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-6xl font-black text-blue-800 drop-shadow-md text-center">
            <span className="inline-block animate-bounce">W</span>
            <span className="inline-block animate-pulse">E</span>
            <span className="inline-block animate-spin">L</span>
            <span className="inline-block">C</span>
            <span className="inline-block animate-bounce">O</span>
            <span className="inline-block">M</span>
            <span className="inline-block animate-ping">E</span>
          </h1>
          <p className="mt-4 text-xl text-red-600 bg-white p-2 inline-block transform -skew-x-12">
            Graphic Design is my{' '}
            <span className="font-bold underline decoration-wavy decoration-blue-500">
              PASSION
            </span>
          </p>
        </div>

        {/* Section 2: The Useless Counter */}
        <div className="bg-orange-400 p-6 rounded-[50px_0_50px_0] border-4 border-black flex flex-col items-center justify-center gap-4">
          <h2 className="text-3xl text-white font-serif uppercase tracking-tighter">
            Meaningless Number
          </h2>
          <div className="text-8xl font-mono bg-black text-green-500 p-4 rounded border-b-8 border-gray-600">
            {count.toFixed(2)}
          </div>
          <button
            onClick={handleBadClick}
            className="px-8 py-4 bg-red-600 text-yellow-300 font-bold text-2xl border-4 border-yellow-300 rounded-full hover:bg-red-700 active:scale-90 transition-transform shadow-lg"
          >
            {text}
          </button>
        </div>

        {/* Section 3: The Broken Form */}
        <div className="bg-pink-200 p-8 border-[12px] border-inset border-blue-400 col-span-1 md:col-span-2">
          <h3 className="text-4xl text-center mb-6 text-indigo-900 underline decoration-4 decoration-lime-500">
            Submit Your Soul
          </h3>
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <label className="text-2xl bg-yellow-300 px-2 rotate-1">
                Name:
              </label>
              <input
                type="range"
                min="0"
                max="100"
                className="w-full h-8 bg-gradient-to-r from-red-500 to-blue-500 appearance-none rounded-lg cursor-wait"
              />
              <span className="text-xs text-gray-500">
                (Adjust for name length)
              </span>
            </div>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-xl mb-2 text-purple-800">
                  Favorite Color:
                </label>
                <div className="flex gap-1">
                  <div className="w-8 h-8 bg-red-500 rounded-full border-2 border-black cursor-not-allowed opacity-50" />
                  <div className="w-8 h-8 bg-blue-500 rounded-full border-2 border-black cursor-not-allowed opacity-50" />
                  <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-black cursor-not-allowed opacity-50" />
                </div>
                <input
                  type="text"
                  placeholder="Type 'Green' here but only in hex"
                  className="mt-2 w-full p-2 border-4 border-dotted border-red-500 bg-gray-100 font-mono text-sm focus:outline-none focus:ring-4 focus:ring-yellow-400"
                />
              </div>
              <button
                type="button"
                className="h-16 w-16 bg-gradient-to-tr from-gray-700 to-gray-900 text-white rounded-lg flex items-center justify-center hover:animate-spin"
              >
                <Skull size={32} />
              </button>
            </div>
            <div className="bg-white p-4 border border-gray-300 shadow-inner">
              <label className="flex items-center gap-4 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-8 h-8 accent-pink-500"
                  defaultChecked
                />
                <span className="text-lg line-through text-gray-400">
                  I agree to the terms and conditions
                </span>
              </label>
              <label className="flex items-center gap-4 cursor-pointer mt-2">
                <input type="checkbox" className="w-4 h-4 accent-black" />
                <span className="text-xs font-bold text-red-600 uppercase">
                  I agree to give you my first born child
                </span>
              </label>
            </div>
          </form>
        </div>
      </div>

      {/* Floaters */}
      <motion.div
        variants={chaoticVariants}
        animate="animate"
        className="fixed bottom-10 right-10 bg-yellow-400 p-4 border-4 border-black rounded-full z-40 shadow-2xl"
      >
        <div className="flex flex-col items-center">
          <Siren className="text-red-600 animate-pulse" size={48} />
          <span className="font-bold text-xs mt-1 bg-white px-1">URGENT</span>
        </div>
      </motion.div>
      <div className="fixed top-1/2 left-0 transform -translate-y-1/2 bg-blue-600 text-white p-2 rotate-90 origin-left border-b-4 border-white shadow-lg z-30">
        FEEDBACK
      </div>
      <div className="mt-8 text-center bg-black p-12 text-green-400 font-mono border-t-8 border-green-600 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none flex flex-wrap">
          {Array.from({ length: 50 }).map((_, i) => (
            <div key={i} className="text-xs p-1">
              {Math.random() > 0.5 ? '1' : '0'}
            </div>
          ))}
        </div>
        <h4 className="text-2xl mb-4 relative z-10">System Status</h4>
        <div className="flex justify-center gap-8 relative z-10">
          <div className="flex flex-col items-center gap-2">
            <Zap className="text-yellow-400 animate-pulse" />
            <span>CPU: {Math.floor(Math.random() * 200)}%</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Trash2 className="text-gray-400" />
            <span>MEM: LEAKING</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <PartyPopper className="text-pink-400 animate-bounce" />
            <span>VIBES: OFF</span>
          </div>
        </div>
        <div className="mt-6 w-full bg-gray-800 h-6 border border-green-500 rounded-none relative">
          <motion.div
            className="h-full bg-green-500"
            animate={{ width: ['0%', '100%', '0%'] }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <span className="absolute inset-0 flex items-center justify-center text-xs text-white mix-blend-difference font-bold">
            LOADING VIRUS...
          </span>
        </div>
      </div>

      {/* Random annoying popup */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 2, duration: 0.5, type: 'spring' }}
        className="fixed top-1/4 left-1/4 bg-white border-4 border-blue-800 shadow-[20px_20px_0_rgba(0,0,0,0.5)] p-0 w-64 z-50"
      >
        <div className="bg-blue-800 text-white p-1 font-bold flex justify-between items-center cursor-move">
          <span>Message</span>
          <button
            type="button"
            className="bg-gray-300 text-black px-2 border border-white hover:bg-gray-400"
          >
            X
          </button>
        </div>
        <div className="p-6 text-center">
          <AlertTriangle className="mx-auto text-yellow-500 mb-2" size={32} />
          <p className="font-serif">You have won a free iPhone 4!</p>
          <button
            type="button"
            className="mt-4 bg-green-600 text-white px-4 py-1 border-2 border-green-800 shadow active:translate-y-1"
          >
            Claim Now
          </button>
        </div>
      </motion.div>
    </div>
  );
};
