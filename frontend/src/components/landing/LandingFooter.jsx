import { Link } from 'react-router-dom'
import ClutchLogo from '../common/ClutchLogo'
import { AnimatedGradientText } from '@/components/ui/animated-gradient-text'

export default function LandingFooter() {
  return (
    <footer className="bg-[#07080C] border-t border-white/[0.06] py-10 px-5" aria-label="Footer">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Left — Brand */}
          <div className="flex items-center gap-2.5">
            <div className="drop-shadow-[0_0_8px_rgba(212,147,13,0.4)]">
              <ClutchLogo size={28} />
            </div>
            <span className="font-display font-bold text-[#F0EDE6] text-base">
              Clutch Fantasy Sports
            </span>
          </div>

          {/* Center — Nav */}
          <div className="flex flex-wrap gap-x-8 gap-y-2 font-body text-sm text-[#5C5952]">
            <Link to="/golf" className="hover:text-[#908C84] transition-colors">Golf Hub</Link>
            <Link to="/nfl" className="hover:text-[#908C84] transition-colors">NFL Hub</Link>
            <Link to="/prove-it" className="hover:text-[#908C84] transition-colors">Prove It</Link>
            <Link to="/lab" className="hover:text-[#908C84] transition-colors">The Lab</Link>
            <Link to="/import" className="hover:text-[#908C84] transition-colors">Import</Link>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <AnimatedGradientText
            colorFrom="#D4930D"
            colorTo="#F06820"
            className="font-mono text-[11px] tracking-wider"
          >
            Private. Compounding. Yours.
          </AnimatedGradientText>

          <div className="flex gap-6 text-xs text-[#5C5952]">
            <a href="#" className="hover:text-[#908C84] transition-colors">Privacy</a>
            <span className="text-[#5C5952]">&middot;</span>
            <a href="#" className="hover:text-[#908C84] transition-colors">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
