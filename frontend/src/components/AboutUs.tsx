import React, { useEffect, useState } from 'react';
import styles from './AboutUs.module.css';
import { FaArrowRight } from 'react-icons/fa';
import Navbar from './Navbar';
import Footer from './Footer';
import Carousel from './Carousel';

const AboutUs: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    setIsVisible(true);

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={styles.container}>
      <Navbar isScrolled={isScrolled} />
      
      <div className={styles.heroSection}>
        <div className={styles.leftSide}>
          <div>
            <h1 className={styles.title}>About Us</h1>
            
            <div className={styles.visualWrapper}>
              <div className={styles.dataOrb}>
                <div className={styles.dataLine}>
                  <div className={styles.dataParticle}></div>
                </div>
                <div className={styles.dataLine}>
                  <div className={styles.dataParticle}></div>
                </div>
                <div className={styles.dataLine}>
                  <div className={styles.dataParticle}></div>
                </div>
              </div>
              <div className={styles.flowLines}></div>
            </div>
          </div>
          
          <div className={styles.textSection}>
            <p className={styles.description}>
              We're five students from UC Santa Cruz who built Canvas to Notion as part of a class project. Like most students, we were tired of manually copying assignments into Notion. Our goal isn't to reinvent how students organize — just to make it easier to keep track of things without the busywork. We care a lot about making tools that are simple, fast, and don't get in your way. If it helps even a few other people stay on top of their work, that's a win.
            </p>
            <p className={styles.description}>
            Along the way, we’ve learned a lot — not just about building Chrome extensions and working with APIs, but about designing something people actually want to use. We’ve kept things intentionally lightweight: no clutter, no unnecessary features, just the essentials done well. We’re continuing to refine it based on feedback and our own experience as students. We’re not a startup or a company (yet) — just a team trying to solve a real problem. But we’re serious about making this great. And we’re just getting started.
            </p>
          </div>
        </div>
      </div>
      
      <div className={styles.teamSection}>
        <h2 className={styles.teamTitle}>Meet Our Team</h2>
        <Carousel />
      </div>
      
      <div className={styles.backgroundGradient}></div>
      
      <Footer />
    </div>
  );
};

export default AboutUs; 