import React, { useState, useEffect, useRef } from 'react';
import styles from './LandingPage.module.css';
import Navbar from './Navbar';
import Footer from './Footer';
import Hero from './Hero';
import Features from './Features';
import FinalCTA from './FinalCTA';
import BrowserMockup from './BrowserMockup';
import FAQ from './FAQ';

const LandingPage: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const heroContentRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const featureCardsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observerOptions = {
      threshold: 0.2,
      rootMargin: '0px'
    };

    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add(styles.visible);
        }
      });
    };

    const observer = new IntersectionObserver(handleIntersection, observerOptions);

    if (heroContentRef.current) {
      observer.observe(heroContentRef.current);
    }
    if (mockupRef.current) {
      observer.observe(mockupRef.current);
    }

    if (featureCardsRef.current) {
      const cards = featureCardsRef.current.children;
      Array.from(cards).forEach(card => {
        observer.observe(card);
      });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className={styles.container}>
      <Navbar isScrolled={isScrolled} />
      <Hero />
      <BrowserMockup />
      <Features />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
};

export default LandingPage; 