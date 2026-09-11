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
        <h2>Canvas to Notion: Web App & Chrome Extension</h2>
        <p className={styles.lastUpdated}>Last Updated: September 10, 2026</p>

        <div className={styles.introduction}>
          <p>Canvas to Notion ("Company," "we," "us," "our") provides a web application and a Chrome browser extension that sync academic assignments from Canvas LMS to user-designated Notion databases (together, the "Services"). These Terms of Service ("Terms") govern your use of the Services. By installing, accessing, or using the Services, you agree to be bound by these Terms and by our <a href="/privacy">Privacy Policy</a>, which is incorporated into these Terms by reference. If you do not agree to these Terms or the Privacy Policy, you may not use the Services.</p>
        </div>

        <section>
          <h2>1. Service Overview and License Terms</h2>
          <h3>1.1 Description of Services</h3>
          <p>The Services consist of our Chrome browser extension and our web application (including the account, settings, and billing dashboard), which connect your Canvas account with Notion through secure APIs. The Services help users export assignments, deadlines, and task details to Notion. The Services are offered on a free plan and on paid plans (see Section 9) and are intended for personal or academic use only.</p>

          <h3>1.2 License Grant</h3>
          <p>We grant you a limited, non-exclusive, non-transferable, revocable license to install and use the Services for your personal or educational use. You may not reverse-engineer, modify, sell, or redistribute the Services or any part thereof.</p>

          <h3>1.3 Service Changes and Disruptions</h3>
          <p>We may update, suspend, or discontinue the Services (or any feature thereof) at any time without notice. We are not liable for any interruptions, errors, or data syncing failures resulting from outages or changes to the Canvas or Notion APIs.</p>
        </section>

        <section>
          <h2>2. Eligibility and User Accounts</h2>

          <h3>2.1 Eligibility</h3>
          <p>You must be at least 13 years old to use the Services. If you are under the age of majority in your jurisdiction, you may use the Services only with the involvement and consent of a parent or legal guardian who agrees to be bound by these Terms on your behalf. By using the Services, you represent that you meet these requirements.</p>

          <h3>2.2 Accounts and Authentication</h3>
          <p>You must create an account and sign in to use the Services. You are responsible for maintaining the confidentiality of your login credentials and for all activity under your account. You agree to notify us immediately of any unauthorized use of your account or credentials.</p>

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
            <li>Share, resell, or transfer your account or a paid plan to anyone else.</li>
            <li>Circumvent, or attempt to circumvent, plan limits, including the free plan's class limit (for example, by rotating Notion workspaces or creating multiple accounts).</li>
            <li>Initiate a fraudulent or bad-faith chargeback or payment dispute instead of using our refund process.</li>
          </ul>
          <p>Violation of this section may result in suspension or termination of your access to the Services.</p>
        </section>

        <section>
          <h2>4. Intellectual Property</h2>
          <p>The Canvas to Notion logo, codebase, and documentation are owned by the Company. Canvas and Notion are trademarks of their respective owners. The Services are independently developed and not affiliated with or endorsed by Instructure or Notion Labs Inc.</p>
        </section>

        <section>
          <h2>5. Data and Privacy</h2>
          <p>We collect and store only the data needed to deliver the core functionality of the Services (e.g., assignment metadata, API tokens). Our collection and use of personal information is described in our <a href="/privacy">Privacy Policy</a>, and by using the Services you agree to it.</p>
          <p>You retain ownership of your data. We do not sell your data to third parties. Aggregated, anonymized usage metrics may be used to improve the product.</p>
        </section>

        <section>
          <h2>6. Term and Termination</h2>
          <p>These Terms remain in effect while you use the Services. You may stop using the Services at any time by: (a) deleting your account from the Settings page; (b) cancelling any active subscription through the Stripe billing portal, which is accessible from the Settings page; and (c) uninstalling the Chrome extension. Deleting your account does not by itself cancel a subscription, and cancelling a subscription does not delete your account, so do both if you want to fully close your account. We may suspend or terminate your access at our sole discretion, including for violations of these Terms. If we terminate your access for cause, you are not entitled to a refund and remain responsible for any fees accrued before termination.</p>
        </section>

        <section>
          <h2>7. Disclaimers</h2>
          <p>The Services are provided "as is." We do not guarantee uninterrupted syncing, error-free operation, or compatibility with future versions of Canvas or Notion APIs. We are not liable for data loss or missed deadlines. Some jurisdictions do not allow the exclusion of certain warranties, so some of the above exclusions may not apply to you.</p>
        </section>

        <section>
          <h2>8. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, we disclaim liability for any damages or losses related to your use of the Services. Our total liability to you for any claim shall not exceed the greater of the fees you paid us in the 12 months before the claim or $50. Some jurisdictions do not allow the limitation or exclusion of liability for certain damages, so some of the above may not apply to you; in that case, our liability is limited to the smallest amount permitted by law.</p>
        </section>

        <section>
          <h2>9. Subscriptions, Lifetime Access, and Billing</h2>

          <h3>9.1 Plans</h3>
          <p>The Services are offered on a free plan and on paid plans. Paid plans consist of "Pro," billed as a recurring monthly subscription, and "Lifetime," a one-time purchase that grants continued access to Pro features. The features and limits of each plan are described on our pricing page and may change over time.</p>

          <h3>9.2 Free Plan Class Limit</h3>
          <p>The free plan allows you to sync up to five (5) Canvas classes to Notion. A class counts toward this limit the first time you sync it; re-syncing a class you have already synced does not count again and continues to work. The limit is tracked per Notion workspace, so reconnecting the same workspace preserves your existing count, and separate accounts connected to the same workspace share the same five-class allowance. Once the limit is reached, you may continue syncing your existing classes but must upgrade to a paid plan to sync additional classes. The Pro and Lifetime plans have no class limit.</p>

          <h3>9.3 Payment Processing</h3>
          <p>Payments are processed by Stripe. By purchasing a paid plan, you agree to Stripe's terms and authorize us, through Stripe, to charge your payment method for the applicable fees plus any taxes. You are responsible for providing a valid payment method and keeping it current.</p>

          <h3>9.4 Subscription Renewal and Cancellation</h3>
          <p>Pro subscriptions renew automatically at the end of each billing period until cancelled. You may cancel at any time through the billing portal. Cancellation takes effect at the end of the current billing period, and you retain Pro access until then. Except where required by law, we do not provide prorated refunds for partial subscription periods.</p>

          <h3>9.5 Refunds</h3>
          <p>A Lifetime purchase may be refunded within 7 days of purchase by request from the Settings page or by contacting us. After the 7-day window, Lifetime purchases are non-refundable. Lifetime access is a one-time grant and cannot be repurchased or transferred to another account.</p>

          <h3>9.6 Price Changes</h3>
          <p>We may change plan prices and the features included in a plan at any time, at our sole discretion, and we do not guarantee that any price will stay the same. For subscriptions, a price change applies on your next renewal; if you do not agree to the new price, you may cancel before that renewal. Continued use of a paid plan after a price change takes effect constitutes acceptance of the new price.</p>

          <h3>9.7 Non-Payment</h3>
          <p>If a charge fails or a subscription lapses, we may downgrade your account to the free plan and restrict paid features until payment is resolved.</p>
        </section>

        <section>
          <h2>10. Governing Law</h2>
          <p>These Terms are governed by the laws of the State of California, without regard to its conflict of law provisions. Any disputes arising from these Terms or the Services shall be resolved in the courts located in California.</p>
        </section>

        <section>
          <h2>11. Modifications to Terms</h2>
          <p>We may revise these Terms from time to time. Updated terms will be posted on our website, in the Chrome Web Store listing, or within the extension, and the "Last Updated" date above will change. For material changes, we may also notify you by email. Continued use of the Services after changes take effect constitutes your acceptance of the new terms.</p>
        </section>

        <section>
          <h2>12. General</h2>
          <p>If any provision of these Terms is found to be unenforceable or invalid, that provision will be limited or removed to the minimum extent necessary, and the remaining provisions will remain in full force and effect. Our failure to enforce any provision is not a waiver of our right to do so later. These Terms, together with the Privacy Policy, are the entire agreement between you and the Company regarding the Services. You may not assign these Terms without our consent; we may assign them in connection with a merger, acquisition, or sale of assets.</p>
        </section>

        <section>
          <h2>13. Contact Us</h2>
          <p>If you have any questions or concerns about these Terms or the Services, please contact us at:</p>
          <p>📧 Email: <a href="mailto:canvastonotioninfo@gmail.com">canvastonotioninfo@gmail.com</a></p>
        </section>
      </div>
      <Footer />
    </div>
  );
};

export default Terms; 