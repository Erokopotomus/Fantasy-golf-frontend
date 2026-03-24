import HeroSection from '../components/landing/HeroSection'
import ProblemSection from '../components/landing/ProblemSection'
import AiReframeSection from '../components/landing/AiReframeSection'
import TwoLayersSection from '../components/landing/TwoLayersSection'
import CompetenciesSection from '../components/landing/CompetenciesSection'
import ViewToggleSection from '../components/landing/ViewToggleSection'
import ImportCtaSection from '../components/landing/ImportCtaSection'
import LandingFooter from '../components/landing/LandingFooter'

export default function Landing() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <ProblemSection />
      <AiReframeSection />
      <TwoLayersSection />
      <CompetenciesSection />
      <ViewToggleSection />
      <ImportCtaSection />
      <LandingFooter />
    </div>
  )
}
