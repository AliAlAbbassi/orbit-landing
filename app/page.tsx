"use client";

import AnimatedShaderHero from "@/components/ui/animated-shader-hero";
import { useState } from "react";

export default function Home() {
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Waitlist email:", email);
    // TODO: Add actual waitlist submission logic here
    setEmail("");
  };

  return (
    <div className="min-h-screen">
      <AnimatedShaderHero 
        headline={{
          line1: "Orbit",
          line2: ""
        }}
        subtitle="cursor for music production"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-md mx-auto mt-8">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            className="w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
          <button
            type="submit"
            className="mx-auto px-8 py-3 bg-gradient-to-r from-orange-400 to-yellow-400 text-black font-semibold rounded-lg hover:from-orange-500 hover:to-yellow-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            Join Waitlist
          </button>
        </form>
      </AnimatedShaderHero>
    </div>
  );
}
