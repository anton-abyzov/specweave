import type { ReactNode } from 'react';
import Layout from '@theme/Layout';
import HeroSection from '../components/sections/HeroSection';
import TrustedBySection from '../components/sections/TrustedBySection';
import DemoVideoSection from '../components/sections/DemoVideoSection';
import HowItWorksSection from '../components/sections/HowItWorksSection';
import WhySpecFirstSection from '../components/sections/WhySpecFirstSection';
import ShowcaseSection from '../components/sections/ShowcaseSection';
import TopSkillsSection from '../components/sections/TopSkillsSection';
import IntegrationsSection from '../components/sections/IntegrationsSection';
import CTASection from '../components/sections/CTASection';

export default function Home(): ReactNode {
  return (
    <Layout
      title="Stop Prompting. Start Specifying."
      description="SpecWeave turns ad-hoc AI prompts into structured, testable, autonomous development. 636+ increments. 10+ production apps. 100+ skills."
    >
      <HeroSection />
      <main>
        <TrustedBySection />
        <DemoVideoSection />
        <HowItWorksSection />
        <WhySpecFirstSection />
        <ShowcaseSection />
        <TopSkillsSection />
        <IntegrationsSection />
        <CTASection />
      </main>
    </Layout>
  );
}
