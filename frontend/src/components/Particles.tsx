import { useCallback, useEffect, useMemo, useState } from 'react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { Container } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import styles from './LandingPage.module.css';

const ParticlesComponent = () => {
  const [init, setInit] = useState(false);

  // this should be run only once per application lifetime
  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = useCallback(async (container: Container | undefined) => {
    console.log(container);
  }, []);

  const options = useMemo(() => ({
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
  }), []);

  if (!init) {
    return null;
  }

  return (
    <div className={styles.particlesContainer}>
      <Particles
        id="tsparticles"
        particlesLoaded={particlesLoaded}
        options={options}
      />
    </div>
  );
};

export default ParticlesComponent;