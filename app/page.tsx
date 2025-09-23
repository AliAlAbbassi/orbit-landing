import AnimatedShaderHero from "@/components/ui/animated-shader-hero";
import { EmailSignupForm } from "@/components/email-signup-form";

export default function Home() {
  return (
    <div className="min-h-screen">
      <AnimatedShaderHero
        headline={{
          line1: "Orbit",
          line2: ""
        }}
        subtitle="cursor for music production"
      >
        <div className="mt-8">
          <EmailSignupForm />
        </div>
      </AnimatedShaderHero>
    </div>
  );
}
