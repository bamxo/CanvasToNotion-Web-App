import React, { useState, useEffect, useRef } from 'react';
import styles from './LandingPage.module.css';
import Navbar from './Navbar';
import Footer from './Footer';
import Hero from './Hero';
import Features from './Features';
import FinalCTA from './FinalCTA';
import BrowserMockup from './BrowserMockup';
import FAQ from './FAQ';
import SplashScreen from './SplashScreen';

const LandingPage: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [contentVisible, setContentVisible] = useState(false);
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

  useEffect(() => {
    // Handle splash screen timing
    const splashDuration = 2000; // 2 seconds for splash screen
    const fadeOutDuration = 600; // 0.6 seconds for fade transitions

    // Start fading out splash screen after splashDuration
    const splashTimer = setTimeout(() => {
      setShowSplash(false);
      
      // Start fading in content slightly before splash screen completely fades out
      // This creates a smoother transition between splash and content
      setTimeout(() => {
        setContentVisible(true);
      }, fadeOutDuration / 2);
    }, splashDuration);

    return () => clearTimeout(splashTimer);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen fadeOut={!showSplash} />}
      <div className={`${styles.container} ${contentVisible ? styles.visible : styles.hidden}`}>
        <Navbar isScrolled={isScrolled} />
        <Hero />
        <BrowserMockup />
        <Features />
        <FAQ />
        <FinalCTA />
        <Footer />
      </div>
    </>
  );
};

export default LandingPage;