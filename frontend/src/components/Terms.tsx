import React, { useState, useEffect } from 'react';
import styles from './Terms.module.css';
import Navbar from './Navbar';
import Footer from './Footer';

const Terms: React.FC = () => {
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
      <div className={styles.termsContent}>
        <h1>Terms of Service</h1>
        <h2>Canvas to Notion Sync Extension</h2>
        <p className={styles.lastUpdated}>Last Updated: April 23, 2025</p>

        <div className={styles.introduction}>
          <p>Canvas to Notion ("Company," "we," "us," "our") provides a browser extension that syncs academic assignments from Canvas LMS to user-designated Notion databases (the "Services"). These Terms of Service ("Terms") govern your use of the Services. By installing, accessing, or using our Services, you agree to be bound by these Terms. If you do not agree to these Terms, you may not use the Services.</p>
        </div>

        <section>
          <h2>1. Service Overview and License Terms</h2>
          <h3>1.1 Description of Services</h3>
          <p>Canvas to Notion provides a Chrome extension that connects your Canvas account with Notion through secure APIs. The Services help users export assignments, deadlines, and task details to Notion. The Services are free to use and intended for personal or academic use only.</p>

          <h3>1.2 License Grant</h3>
          <p>We grant you a limited, non-exclusive, non-transferable, revocable license to install and use the Services for your personal or educational use. You may not reverse-engineer, modify, sell, or redistribute the Services or any part thereof.</p>

          <h3>1.3 Service Changes and Disruptions</h3>
          <p>We may update, suspend, or discontinue the Services (or any feature thereof) at any time without notice. We are not liable for any interruptions, errors, or data syncing failures resulting from outages or changes to the Canvas or Notion APIs.</p>
        </section>

        <section>
          <h2>2. User Accounts and Authentication</h2>
          <p>You must authenticate via Firebase to use the Services. You are responsible for maintaining the confidentiality of your login credentials. You agree to notify us immediately of any unauthorized use of your authentication credentials.</p>
          
          <p>By using the Services, you confirm that:</p>
          <ul>
            <li>You are authorized to use your Canvas and Notion accounts.</li>
            <li>You will not share API tokens or credentials with third parties.</li>
            <li>Your use complies with institutional academic integrity policies.</li>
          </ul>
        </section>

        <section>
          <h2>3. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Services for unlawful purposes or to violate any law.</li>
            <li>Exploit bugs or security flaws in Canvas to Notion, Canvas, or Notion.</li>
            <li>Automate usage in a way that burdens external APIs.</li>
            <li>Upload, share, or sync inappropriate or unauthorized content.</li>
          </ul>
          <p>Violation of this section may result in suspension or termination of your access to the Services.</p>
        </section>

        <section>
          <h2>4. Intellectual Property</h2>
          <p>The Canvas to Notion logo, codebase, and documentation are owned by the Company. Canvas and Notion are trademarks of their respective owners. This extension is independently developed and not affiliated with or endorsed by Instructure or Notion Labs Inc.</p>
        </section>

        <section>
          <h2>5. Data and Privacy</h2>
          <p>We collect and store only the data needed to deliver the core functionality of the extension (e.g., assignment metadata, API tokens). See our Privacy Policy for full details.</p>
          <p>You retain ownership of your data. We do not sell your data to third parties. Aggregated, anonymized usage metrics may be used to improve the product.</p>
        </section>

        <section>
          <h2>6. Term and Termination</h2>
          <p>These Terms remain in effect while you use the Services. You may terminate use at any time by uninstalling the extension. We may suspend or terminate access at our sole discretion, especially for violations of these Terms.</p>
        </section>

        <section>
          <h2>7. Disclaimers</h2>
          <p>The Services are provided "as is." We do not guarantee uninterrupted syncing, error-free operation, or compatibility with future versions of Canvas or Notion APIs. We are not liable for data loss or missed deadlines.</p>
        </section>

        <section>
          <h2>8. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, we disclaim liability for any damages or losses related to your use of the Services. Our total liability to you for any claim shall not exceed $50.</p>
        </section>

        <section>
          <h2>9. Governing Law</h2>
          <p>These Terms are governed by the laws of the State of California, without regard to its conflict of law provisions. Any disputes arising from these Terms or the Services shall be resolved in the courts located in California.</p>
        </section>

        <section>
          <h2>10. Modifications to Terms</h2>
          <p>We may revise these Terms from time to time. Updated terms will be posted in the Chrome Web Store listing or within the extension. Continued use of the Services after changes constitutes your acceptance of the new terms.</p>
        </section>

        <section>
          <h2>11. Contact Us</h2>
          <p>If you have any questions or concerns about these Terms or the Services, please contact us at:</p>
          <p>📧 Email: <a href="mailto:canvastonotioninfo@gmail.com">canvastonotioninfo@gmail.com</a></p>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Terms; 