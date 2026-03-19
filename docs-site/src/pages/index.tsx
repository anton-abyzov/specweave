import type { ReactNode } from 'react';
import Layout from '@theme/Layout';
import HeroSection from '../components/sections/HeroSection';
import TrustedBySection from '../components/sections/TrustedBySection';
import DemoVideoSection from '../components/sections/DemoVideoSection';
import HowItWorksSection from '../components/sections/HowItWorksSection';
import CapabilitiesSection from '../components/sections/CapabilitiesSection';
import AcademyPromoSection from '../components/sections/AcademyPromoSection';
import StatsSection from '../components/sections/StatsSection';
import IntegrationsSection from '../components/sections/IntegrationsSection';
import VerifiedSkillsSection from '../components/sections/VerifiedSkillsSection';
import SkillStudioSection from '../components/sections/SkillStudioSection';
import CTASection from '../components/sections/CTASection';

export default function Home(): ReactNode {
  return (
    <Layout
      title="The Development Loom — Ship Features While You Sleep"
      description="Weave specs into shipping software. Describe features in English, AI builds autonomously, ship while you sleep. Persistent memory, quality gates, and living documentation."
    >
      <HeroSection />
      <main>
        <TrustedBySection />
        <DemoVideoSection />
        <HowItWorksSection />
        <CapabilitiesSection />
        <IntegrationsSection />
        <VerifiedSkillsSection />
        <SkillStudioSection />
        <StatsSection />
        <AcademyPromoSection />
        <CTASection />
      </main>
    </Layout>
  );
}
