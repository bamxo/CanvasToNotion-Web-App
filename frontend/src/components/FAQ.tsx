import React, { useState, memo } from 'react';
import styles from './FAQ.module.css';
import { FaChevronDown } from 'react-icons/fa';

interface FaqItemProps {
  faq: {
    question: string;
    answer: string;
  };
  index: number;
  isExpanded: boolean;
  onToggle: (index: number) => void;
}

const FaqItem = memo(({ faq, index, isExpanded, onToggle }: FaqItemProps) => (
  <div 
    className={`${styles.faqItem} ${isExpanded ? styles.expanded : ''} ${styles.visible}`}
    onClick={() => onToggle(index)}
  >
    <div className={styles.faqQuestion}>
      <h3>{faq.question}</h3>
      <FaChevronDown className={`${styles.faqIcon} ${isExpanded ? styles.rotate : ''}`} />
    </div>
    <div className={styles.faqAnswer}>
      <p>{faq.answer}</p>
    </div>
  </div>
));

FaqItem.displayName = 'FaqItem';

const FAQ: React.FC = () => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(prev => prev === index ? null : index);
  };

  const faqs = [
    {
      question: "Is Canvas to Notion free to use?",
      answer: "Yes! Canvas to Notion is completely free to use. There are no premium tiers or hidden fees. All features are available to all users at no cost."
    },
    {
      question: "How do I connect Notion and Canvas?",
      answer: "Simply install our Chrome extension, log in with your Canvas credentials, and authorize access to your Notion workspace. Our setup wizard will guide you through connecting your accounts in just a few clicks."
    },
    {
      question: "Is my data secure?",
      answer: "Yes, your data is fully encrypted and we never store your Canvas or Notion passwords. We use OAuth for secure authentication and only sync the data you explicitly authorize. Your privacy and security are our top priorities."
    },
    {
      question: "Does it work with all schools?",
      answer: "Our extension works with any institution that uses Canvas as their learning management system. If your school uses Canvas, you're good to go! If you encounter any compatibility issues, please contact our support team."
    }
  ];

  return (
    <section className={styles.faqs} id="faq">
      <h2 className={styles.sectionTitle}>Have Questions?</h2>
      <div className={styles.faqContainer}>
        {faqs.map((faq, index) => (
          <FaqItem
            key={index}
            faq={faq}
            index={index}
            isExpanded={expandedFaq === index}
            onToggle={toggleFaq}
          />
        ))}
      </div>
    </section>
  );
};

export default FAQ; 