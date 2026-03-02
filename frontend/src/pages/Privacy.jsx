import { Link } from 'react-router-dom'

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-4 pt-24 pb-16">
      <Link to="/signup" className="inline-flex items-center text-text-secondary hover:text-text-primary transition-colors mb-6 text-sm">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </Link>

      <h1 className="text-3xl font-display font-bold text-text-primary mb-2">Privacy Policy</h1>
      <p className="text-text-muted text-sm mb-8">Last updated: March 2, 2026</p>

      <div className="prose prose-sm max-w-none space-y-6 text-text-secondary leading-relaxed">
        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">1. Information We Collect</h2>
          <p><strong>Account information:</strong> Email address, display name, username, and optional avatar image when you create an account.</p>
          <p><strong>Usage data:</strong> League activity, predictions, draft picks, and platform interactions to power features like your Clutch Rating and prediction accuracy tracking.</p>
          <p><strong>Technical data:</strong> Browser type, device information, and IP address for security and performance purposes.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">2. How We Use Your Information</h2>
          <p>We use your information to: operate and improve the platform; calculate your Clutch Rating and prediction stats; personalize your experience (AI coaching, insights); send league notifications and updates; and maintain platform security.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">3. Information Sharing</h2>
          <p>We do not sell your personal information. Your league activity, predictions, and Clutch Rating may be visible to other users within your leagues. Public profiles display your username, Clutch Rating, and prediction stats. We may share anonymized, aggregated data for analytics purposes.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">4. Data from Imported Leagues</h2>
          <p>When you import league history from ESPN, Yahoo, Sleeper, Fantrax, or MFL, we store that data to build your League Vault and calculate historical stats. This data is only accessible to members of the league it belongs to (and publicly via vault invite links if enabled by the commissioner).</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">5. Third-Party Services</h2>
          <p>We use third-party services for hosting (Vercel, Railway), image storage (Cloudinary), analytics, and sports data (DataGolf, ESPN, nflverse). These providers have their own privacy policies.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">6. Data Security</h2>
          <p>We use industry-standard security measures including encrypted passwords (bcrypt), JWT authentication, rate limiting, and input validation. However, no method of electronic transmission or storage is 100% secure.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">7. Data Retention</h2>
          <p>Your account data is retained as long as your account is active. You may request deletion of your account and associated data by contacting us. League history data may be retained if other league members depend on it.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">8. Cookies</h2>
          <p>We use localStorage and cookies for authentication (JWT tokens), theme preferences, and coach profile settings. We do not use third-party advertising cookies.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">9. Children's Privacy</h2>
          <p>Clutch is not intended for children under 13. We do not knowingly collect personal information from children under 13.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">10. Changes to This Policy</h2>
          <p>We may update this privacy policy from time to time. We will notify users of material changes via email or in-app notification.</p>
        </section>

        <section>
          <h2 className="text-lg font-display font-bold text-text-primary mb-2">11. Contact</h2>
          <p>Privacy questions? Reach out at <span className="text-gold font-mono">support@clutchfantasysports.com</span>.</p>
        </section>
      </div>
    </div>
  )
}
