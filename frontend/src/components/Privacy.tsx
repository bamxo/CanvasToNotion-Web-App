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
        <p className={styles.lastUpdated}>Last Updated: April 23, 2025</p>

        <div className={styles.introduction}>
          <p>This Privacy Policy ("Policy") explains how Canvas to Notion ("we," "us," or "our") collects, uses, shares, and protects your personal information when you use our browser extension and related services (the "Services"). By using the Services, you agree to the terms of this Policy.</p>
        </div>

        <section>
          <h2>1. Information We Collect</h2>
          <h3>1.1 Types of Personal Information Collected</h3>
          <p>We collect the following types of data:</p>
          <ul>
            <li>Identifiers: Your email address used for Firebase authentication.</li>
            <li>Canvas API Tokens: Used to fetch your assignments and academic data.</li>
            <li>Notion API Tokens: Used to create and update assignment records in your selected Notion workspace.</li>
            <li>Assignment Metadata: Includes course names, due dates, and task types. We do not collect grades or private course content.</li>
            <li>Usage Data: Anonymous usage statistics and performance metrics to improve the product.</li>
          </ul>

          <h3>1.2 Sources of Data</h3>
          <p>We collect information:</p>
          <ul>
            <li>Directly from you when you authenticate or grant API access.</li>
            <li>Automatically when the extension syncs with Canvas or Notion.</li>
          </ul>
        </section>

        <section>
          <h2>2. How We Use Your Data</h2>
          <p>We use your data to:</p>
          <ul>
            <li>Sync Canvas assignments to your selected Notion database.</li>
            <li>Authenticate and identify users via Firebase.</li>
            <li>Provide basic analytics to improve user experience and extension performance.</li>
            <li>Respond to technical support inquiries.</li>
          </ul>
        </section>

        <section>
          <h2>3. Data Sharing</h2>
          <h3>3.1 Third-Party Services</h3>
          <p>We share data with:</p>
          <ul>
            <li>Firebase for authentication and real-time database services.</li>
            <li>Canvas and Notion APIs to enable syncing functionality.</li>
          </ul>
          <p>These third parties are used solely for the operation of the extension and are bound by their own privacy policies.</p>

          <h3>3.2 Legal Compliance</h3>
          <p>We may disclose personal information to comply with legal obligations, enforce our Terms of Service, or protect our users and services.</p>
        </section>

        <section>
          <h2>4. Cookies and Tracking</h2>
          <p>We do not use tracking cookies or behavioral advertising. We may use local storage and secure tokens within the browser to manage sessions and sync logic.</p>
        </section>

        <section>
          <h2>5. Data Security</h2>
          <p>We use HTTPS encryption for all API communication and restrict access to Firebase data via authenticated rules. While we take reasonable measures to protect your data, no method of transmission over the internet is 100% secure.</p>
        </section>

        <section>
          <h2>6. Your Rights</h2>
          <p>You may:</p>
          <ul>
            <li>Access or delete your data by contacting us directly.</li>
            <li>Uninstall the extension to immediately stop all data collection and syncing.</li>
          </ul>
          <p>For requests, email us at <a href="mailto:canvastonotioninfo@gmail.com">canvastonotioninfo@gmail.com</a>.</p>
        </section>

        <section>
          <h2>7. International Users</h2>
          <p>The Services are hosted in the United States. By using our Services, you consent to the transfer of your data to the U.S. and to third-party services used within the extension.</p>
        </section>

        <section>
          <h2>8. Children's Privacy</h2>
          <p>This extension is not intended for children under 13, and we do not knowingly collect personal information from anyone under 13.</p>
        </section>

        <section>
          <h2>9. Retention</h2>
          <p>We retain user data only as long as necessary for syncing functionality. Data associated with your account may be deleted upon request or after uninstalling the extension.</p>
        </section>

        <section>
          <h2>10. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. Updates will be posted on the Chrome Web Store listing and within the extension interface. Continued use of the Services after changes indicates your acceptance of the updated policy.</p>
        </section>

        <section>
          <h2>11. Contact Us</h2>
          <p>If you have any questions about this Policy or our privacy practices, contact us at:</p>
          <p>📧 Email: <a href="mailto:canvastonotioninfo@gmail.com">canvastonotioninfo@gmail.com</a></p>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Privacy; 