import type { ReactNode } from 'react';
import Layout from '@theme/Layout';
import HeroSection from './sections/HeroSection';
import TrustedBySection from './sections/TrustedBySection';
import DemoVideoSection from './sections/DemoVideoSection';
import HowItWorksSection from './sections/HowItWorksSection';
import CapabilitiesSection from './sections/CapabilitiesSection';
import AcademyPromoSection from './sections/AcademyPromoSection';
import StatsSection from './sections/StatsSection';
import IntegrationsSection from './sections/IntegrationsSection';
import VerifiedSkillsSection from './sections/VerifiedSkillsSection';
import SkillStudioSection from './sections/SkillStudioSection';
import CTASection from './sections/CTASection';

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
