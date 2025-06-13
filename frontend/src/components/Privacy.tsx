import React, { useState, useEffect } from 'react';
import styles from './Privacy.module.css';
import Navbar from './Navbar';
import Footer from './Footer';

const Privacy: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={styles.container}>
      <Navbar isScrolled={isScrolled} />
      <div className={styles.privacyContent}>
        <h1>Privacy Policy</h1>
        <h2>Canvas to Notion Sync Extension</h2>
        <p className={styles.lastUpdated}>Last Updated: January 15, 2025</p>

        <div className={styles.introduction}>
          <p>This Privacy Policy ("Policy") explains how Canvas to Notion ("we," "us," or "our") collects, uses, shares, and protects your personal information when you use our Chrome browser extension and related web services (the "Services"). By using the Services, you agree to the terms of this Policy.</p>
        </div>

        <section>
          <h2>1. Information We Collect</h2>
          
          <h3>1.1 Personal Information</h3>
          <p>We collect the following personal information:</p>
          <ul>
            <li><strong>Email addresses:</strong> Used for Firebase authentication and account identification</li>
            <li><strong>Google account information:</strong> When using Google Sign-In, we collect your name, email, profile picture URL, and email verification status</li>
            <li><strong>Display names:</strong> Either provided during signup or derived from your email address</li>
            <li><strong>User IDs:</strong> Firebase-generated unique identifiers for account management</li>
          </ul>

          <h3>1.2 Canvas Academic Data</h3>
          <p>When you visit Canvas pages (*.instructure.com), our extension accesses:</p>
          <ul>
            <li><strong>Course information:</strong> Course ID, name, course code, and workflow state</li>
            <li><strong>Assignment data:</strong> Assignment ID, name, description, due dates, points possible, and HTML URLs</li>
            <li><strong>Enrollment data:</strong> Only courses from the last 4 months where you are actively enrolled as a student</li>
            <li><strong>Canvas session data:</strong> Accessed automatically when you visit Canvas pages</li>
          </ul>
          <p><strong>Important:</strong> We do NOT collect grades, private course content, or personal communications.</p>

          <h3>1.3 Authentication Tokens and Credentials</h3>
          <ul>
            <li><strong>Firebase authentication tokens:</strong> ID tokens, refresh tokens, and custom tokens for extension communication</li>
            <li><strong>Google OAuth tokens:</strong> For secure authentication via Chrome Identity API</li>
            <li><strong>Canvas API tokens:</strong> Used to fetch your assignments and course data</li>
            <li><strong>Notion API tokens:</strong> Used to create and update content in your Notion workspace</li>
            <li><strong>Session cookies:</strong> Authentication cookies from canvastonotion.io domain</li>
          </ul>

          <h3>1.4 Technical and Usage Data</h3>
          <ul>
            <li><strong>Extension usage data:</strong> When you interact with Canvas pages and sync assignments</li>
            <li><strong>Sync preferences:</strong> Your selected Notion page and sync settings</li>
            <li><strong>Error logs:</strong> Technical information for debugging (stored locally, not transmitted)</li>
            <li><strong>Performance data:</strong> Sync operation status and timing</li>
          </ul>
        </section>

        <section>
          <h2>2. How We Collect Your Data</h2>
          <ul>
            <li><strong>Directly from you:</strong> When you authenticate, grant permissions, or configure settings</li>
            <li><strong>Automatically via extension:</strong> When you visit Canvas pages and the extension is active</li>
            <li><strong>From third-party APIs:</strong> Canvas and Notion APIs when syncing data</li>
            <li><strong>Through authentication:</strong> Google OAuth and Firebase authentication services</li>
          </ul>
        </section>

        <section>
          <h2>3. Data Storage Locations</h2>
          
          <h3>3.1 Local Storage (Chrome Extension)</h3>
          <ul>
            <li>Firebase authentication tokens and timestamps</li>
            <li>User email, user ID, and profile information</li>
            <li>Selected Notion page information and sync preferences</li>
            <li>Canvas token identifiers</li>
            <li>Authentication tokens (encrypted in production, plain text in development)</li>
          </ul>

          <h3>3.2 Firebase Realtime Database</h3>
          <ul>
            <li>User profiles linked to email addresses</li>
            <li>Notion access tokens and workspace information</li>
            <li>Account creation dates and last login information</li>
            <li>Sync status and preferences</li>
          </ul>

          <h3>3.3 Browser Cookies</h3>
          <ul>
            <li>Session cookies for authentication (authToken, sessionid)</li>
            <li>Authentication state cookies (isAuthenticated) - production only</li>
            <li>Cross-domain cookies for web app and extension communication</li>
          </ul>
        </section>

        <section>
          <h2>4. How We Use Your Data</h2>
          <p>We use your data to:</p>
          <ul>
            <li><strong>Sync functionality:</strong> Transfer Canvas assignments to your selected Notion database</li>
            <li><strong>Authentication:</strong> Verify your identity and maintain secure sessions</li>
            <li><strong>Data processing:</strong> Process and simplify Canvas assignment data, including removing HTML formatting from descriptions</li>
            <li><strong>Account management:</strong> Maintain your user profile and preferences</li>
            <li><strong>Technical support:</strong> Respond to support inquiries and troubleshoot issues</li>
            <li><strong>Service improvement:</strong> Analyze usage patterns to improve functionality (no external analytics services used)</li>
          </ul>
        </section>

        <section>
          <h2>5. Data Sharing and Third-Party Services</h2>
          
          <h3>5.1 Required Third-Party Services</h3>
          <p>We share data with the following services to provide our functionality:</p>
          <ul>
            <li><strong>Firebase (Google):</strong> Authentication, user profiles, and database services</li>
            <li><strong>Canvas API:</strong> Read-only access to your course and assignment information</li>
            <li><strong>Notion API:</strong> Write access to create and update content in your connected Notion workspace</li>
            <li><strong>Google OAuth:</strong> Authentication services and profile information</li>
          </ul>

          <h3>5.2 Data Processing</h3>
          <ul>
            <li>Assignment and course data is sent to your connected Notion workspace</li>
            <li>Authentication data is processed by Firebase/Google services</li>
            <li>Data is transmitted to our backend services (canvastonotion.netlify.app and canvastonotion.io)</li>
            <li>HTML content is stripped from assignment descriptions before syncing</li>
          </ul>

          <h3>5.3 No Data Sales or Marketing</h3>
          <p>We do not sell, rent, or share your personal information with third parties for marketing purposes. We do not use behavioral analytics or advertising cookies.</p>
        </section>

        <section>
          <h2>6. Chrome Extension Permissions</h2>
          <p>Our Chrome extension requires the following permissions:</p>
          <ul>
            <li><strong>storage:</strong> Stores authentication tokens and user preferences locally in your browser</li>
            <li><strong>cookies:</strong> Accesses authentication cookies from our domain for secure login</li>
            <li><strong>identity:</strong> Uses Chrome Identity API for secure Google OAuth authentication</li>
            <li><strong>activeTab & tabs:</strong> Detects when you are on Canvas pages to enable sync functionality</li>
            <li><strong>scripting:</strong> Injects content scripts only on Canvas pages (*.instructure.com)</li>
            <li><strong>host permissions:</strong> Allows secure API calls to Canvas, Notion, and our backend services</li>
          </ul>
        </section>

        <section>
          <h2>7. Data Security and Retention</h2>
          
          <h3>7.1 Security Measures</h3>
          <ul>
            <li><strong>Encryption:</strong> HTTPS encryption for all API communications</li>
            <li><strong>Token security:</strong> Authentication tokens are encrypted in production and automatically refreshed every 50 minutes</li>
            <li><strong>Secure cookies:</strong> HttpOnly, Secure, and SameSite attributes on authentication cookies</li>
            <li><strong>Access control:</strong> Firebase security rules restrict database access to authenticated users only</li>
            <li><strong>Token expiration:</strong> Authentication tokens expire after 1 hour for security</li>
          </ul>

          <h3>7.2 Data Retention</h3>
          <ul>
            <li><strong>User account data:</strong> Stored until account deletion or extension uninstall</li>
            <li><strong>Sync data:</strong> Assignment data retained only as long as needed for sync functionality</li>
            <li><strong>Authentication tokens:</strong> Automatically expire and are refreshed; cleared upon logout</li>
            <li><strong>Local storage:</strong> User data removed from local storage upon logout</li>
          </ul>
        </section>

        <section>
          <h2>8. International Data Transfers</h2>
          <p>Our services are hosted in the United States through Netlify and Firebase. By using our Services, you consent to the transfer of your data to the U.S. and processing by third-party services. Your data may be subject to U.S. data protection laws and may be accessible to U.S. government authorities under applicable laws.</p>
        </section>

        <section>
          <h2>9. Your Rights and Control</h2>
          <p>You have the following rights regarding your data:</p>
          <ul>
            <li><strong>Access and deletion:</strong> Request access to or deletion of your personal data by contacting us</li>
            <li><strong>Disconnect services:</strong> Disconnect Notion integration or log out at any time</li>
            <li><strong>Revoke permissions:</strong> Revoke Google OAuth permissions through your Google account settings</li>
            <li><strong>Uninstall extension:</strong> Remove the extension entirely through Chrome settings to stop all data collection</li>
            <li><strong>Data portability:</strong> Request a copy of your data in a portable format</li>
          </ul>
          <p>To exercise these rights, email us at <a href="mailto:canvastonotioninfo@gmail.com">canvastonotioninfo@gmail.com</a>.</p>
        </section>

        <section>
          <h2>10. Technical Implementation</h2>
          <p>For transparency, here are key technical details about our data processing:</p>
          <ul>
            <li>Extension runs background scripts that maintain authentication state</li>
            <li>Content scripts are injected only on Canvas pages (*.instructure.com)</li>
            <li>Data is transmitted securely via HTTPS to Firebase and Notion APIs</li>
            <li>Local storage is used for caching authentication tokens and user preferences</li>
            <li>Background processing handles large sync operations</li>
            <li>Cross-origin requests are restricted to authorized domains</li>
          </ul>
        </section>

        <section>
          <h2>11. Children's Privacy</h2>
          <p>This extension is not intended for children under 13, and we do not knowingly collect personal information from anyone under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.</p>
        </section>

        <section>
          <h2>12. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. Updates will be posted on our website and within the extension interface. The "Last Updated" date at the top of this policy indicates when it was last revised. Continued use of the Services after changes indicates your acceptance of the updated policy.</p>
        </section>

        <section>
          <h2>13. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy or our privacy practices, please contact us at:</p>
          <p>📧 Email: <a href="mailto:canvastonotioninfo@gmail.com">canvastonotioninfo@gmail.com</a></p>
          <p>We will respond to your inquiry within a reasonable timeframe.</p>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy; 