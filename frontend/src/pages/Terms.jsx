import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
      <Link to="/signup" className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors mb-6 text-sm">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Terms of Service</h1>
      <p className="text-text-muted text-sm mb-8">Last updated: March 2, 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">1. Acceptance of Terms</h2>
          <p>By creating an account or using Clutch Fantasy Sports ("Clutch", "we", "us"), you agree to these Terms of Service. If you do not agree, do not use the platform.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">2. Description of Service</h2>
          <p>Clutch is a free season-long fantasy sports platform. We provide league management tools, draft rooms, scoring, predictions, and analytics for fantasy sports including golf and NFL. Clutch is not a gambling, betting, or daily fantasy sports (DFS) platform. No real money is wagered through predictions or any other feature.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">3. User Accounts</h2>
          <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials. You must be at least 13 years old to use Clutch.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">4. User Content</h2>
          <p>You retain ownership of content you create (team names, predictions, blog posts, chat messages). By posting content on Clutch, you grant us a license to display it within the platform. You agree not to post content that is illegal, abusive, or violates the rights of others.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">5. Acceptable Use</h2>
          <p>You agree not to: attempt to gain unauthorized access to the platform or other users' accounts; use automated tools to scrape data; interfere with the platform's operation; or use the platform for any unlawful purpose.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">6. Intellectual Property</h2>
          <p>Clutch and its original content, features, and functionality are owned by Clutch Fantasy Sports. Player statistics and sports data are sourced from third-party providers and used under their respective terms.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">7. Disclaimer of Warranties</h2>
          <p>Clutch is provided "as is" without warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or that data (scores, statistics, projections) will be accurate at all times. Fantasy sports decisions made using Clutch are your own responsibility.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">8. Limitation of Liability</h2>
          <p>To the maximum extent permitted by law, Clutch shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the platform.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">9. Changes to Terms</h2>
          <p>We may update these terms from time to time. Continued use of Clutch after changes constitutes acceptance of the updated terms. We will notify users of material changes via email or in-app notification.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">10. Contact</h2>
          <p>Questions about these terms? Reach out at <span className="text-gold font-mono">support@clutchfantasysports.com</span>.</p>
        </section>
      </div>
    </div>
  )
}
