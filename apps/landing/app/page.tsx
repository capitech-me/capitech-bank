import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Products } from "@/components/products";
import { Features } from "@/components/features";
import { HowItWorks } from "@/components/how-it-works";
import { Security } from "@/components/security";
import { Pricing } from "@/components/pricing";
import { Faq } from "@/components/faq";
import { Cta } from "@/components/cta";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="flex-1">
        <Hero />
        <Products />
        <Features />
        <HowItWorks />
        <Security />
        <Pricing />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
