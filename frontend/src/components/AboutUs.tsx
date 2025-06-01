import React, { useEffect, useState, useRef } from 'react';
import styles from './AboutUs.module.css';
import { FaArrowRight, FaChrome } from 'react-icons/fa';
import Navbar from './Navbar';
import Footer from './Footer';
import Carousel from './Carousel';

const EllipseGradient = () => {
  return (
    <div className={styles.ellipseContainer}>
      <div className={styles.ellipse} />
    </div>
  );
};

const AboutUs: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [storyVisible, setStoryVisible] = useState(false);
  const storySectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Set up the Intersection Observer for the story section
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setStoryVisible(true);
          // Once visible, we can stop observing
          if (storySectionRef.current) {
            observer.unobserve(storySectionRef.current);
          }
        }
      },
      {
        threshold: 0.2, // Trigger when 20% of the element is visible
        rootMargin: '-50px 0px', // Slightly before element is in view
      }
    );

    if (storySectionRef.current) {
      observer.observe(storySectionRef.current);
    }

    return () => {
      if (storySectionRef.current) {
        observer.unobserve(storySectionRef.current);
      }
    };
  }, []);

  const handleButtonClick = () => {
    window.open('https://chromewebstore.google.com/', '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={styles.container}>
      <Navbar isScrolled={isScrolled} />
      
      <div className={styles.heroSection}>
        <div className={styles.heroContent}>
          <h1 className={styles.title}>
            About <span className={styles.highlight}>Canvas to Notion</span>.
          </h1>
          
          <p className={styles.heroSubtitle}>
            Simplifying student workflow by bringing Canvas assignments directly into Notion
          </p>
          
          <div className={styles.ctaButtons}>
            <button 
              onClick={handleButtonClick} 
              className={styles.ctaButton}
              aria-label="Coming Soon"
            >
              <div className={styles.buttonContent}>
                <FaChrome className={styles.chromeIcon} />
                <span>Coming Soon</span>
                <FaArrowRight className={styles.arrowIcon} />
              </div>
            </button>
            <a href="/contact" className={styles.secondaryButton}>Contact Us</a>
          </div>
        </div>
        <EllipseGradient />
      </div>
      
      <div 
        ref={storySectionRef}
        className={`${styles.storySection} ${storyVisible ? styles.storyVisible : ''}`}
      >
        <div className={styles.sectionContent}>
          <h2 className={`${styles.sectionTitle} ${storyVisible ? styles.titleVisible : ''}`}>Our Story</h2>
          
          <div className={styles.textColumns}>
            <p className={`${styles.storyText} ${storyVisible ? styles.textVisible : ''}`}>
              We're five students from UC Santa Cruz who built Canvas to Notion as part of a class project. Like most students, we were tired of manually copying assignments into Notion. Our goal isn't to reinvent how students organize — just to make it easier to keep track of things without the busywork. We care a lot about making tools that are simple, fast, and don't get in your way. If it helps even a few other people stay on top of their work, that's a win.
            </p>
            <p className={`${styles.storyText} ${storyVisible ? styles.textVisible : ''}`}>
              Along the way, we've learned a lot — not just about building Chrome extensions and working with APIs, but about designing something people actually want to use. We've kept things intentionally lightweight: no clutter, no unnecessary features, just the essentials done well. We're continuing to refine it based on feedback and our own experience as students. We're not a startup or a company (yet) — just a team trying to solve a real problem. But we're serious about making this great. And we're just getting started.
            </p>
          </div>
        </div>
      </div>
      
      <div className={styles.teamSection}>
        <h2 className={styles.teamTitle}>Meet Our Team</h2>
        <Carousel />
      </div>
      
      <Footer />
    </div>
  );
};

export default AboutUs; 