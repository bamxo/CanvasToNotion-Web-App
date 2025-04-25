import { useCallback } from 'react';
import type { Container, Engine } from "@tsparticles/engine";
import { Particles } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import styles from './LandingPage.module.css';

const ParticlesComponent = () => {
  const customInit = useCallback(async () => {
    await loadSlim();
  }, []);

  return (
    <div className={styles.particlesContainer}>
      <Particles
        id="tsparticles"
        init={customInit}
        options={{
          fpsLimit: 60,
          particles: {
            color: {
              value: "#EF5223",
            },
            links: {
              color: "#EF5223",
              distance: 150,
              enable: true,
              opacity: 0.2,
              width: 1,
            },
            move: {
              enable: true,
              random: false,
              speed: 1,
              straight: false,
            },
            number: {
              value: 80,
            },
            opacity: {
              value: 0.2,
            },
            shape: {
              type: "circle",
            },
            size: {
              value: { min: 1, max: 3 },
            },
          },
          detectRetina: true,
          fullScreen: false,
          background: {
            color: {
              value: "transparent",
            },
          },
          interactivity: {
            events: {
              onHover: {
                enable: true,
                mode: "grab",
              },
            },
            modes: {
              grab: {
                distance: 140,
                links: {
                  opacity: 0.3,
                },
              },
            },
          },
        }}
      />
    </div>
  );
};

export default ParticlesComponent; 