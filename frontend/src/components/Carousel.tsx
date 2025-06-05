import React, { useState, useEffect, useCallback, useRef, TouchEvent, KeyboardEvent } from 'react';
import styles from './Carousel.module.css';
import { FaChevronLeft, FaChevronRight, FaLinkedin, FaGithub } from 'react-icons/fa';
import benImage from '../assets/IMG_6342.jpg?url';
import milanImage from '../assets/IMG_2899.jpeg?url';
import tanviImage from '../assets/IMG_0524.jpg?url';
import landonImage from '../assets/IMG_5966.png?url';
import juanImage from '../assets/IMG_0000.jpeg?url';

interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
  linkedin?: string;
  github?: string;
}

const teamMembers: TeamMember[] = [
  {
    name: "Ben Liu",
    role: "Backend Engineer",
    bio: "Ben designed and implemented the Canvas data pulling logic and handled the general OAuth integration with Notion. He focused on making sure assignment data could be fetched and transferred smoothly.",
    image: benImage,
    linkedin: "https://www.linkedin.com/in/besaliu",
    github: "https://github.com/besaliu"
  },
  {
    name: "Milan Moslehi",
    role: "Scrum Master, Backend Engineer",
    bio: "Milan led development of the authentication flow, managing user states and sessions. He also handled most of the backend logic and coordination across sprints.",
    image: milanImage,
    linkedin: "https://www.linkedin.com/in/milan-moslehi-190429253",
    github: "https://github.com/milanmos13"
  },
  {
    name: "Juan-Fernando Morales",
    role: "QA Engineer",
    bio: "Juan focused on testing backend functionality, ensuring that data syncing, authentication, and API logic performed reliably under different conditions.",
    image: juanImage,
    linkedin: "https://www.linkedin.com/in/cosmichippo",
    github: "https://github.com/juprmora"
  },
  {
    name: "Tanvi Herwadkar",
    role: "Backend Engineer",
    bio: "Tanvi designed clean and functional Notion templates to present Canvas assignment data in a user-friendly database format, making the extension more useful for students.",
    image: tanviImage,
    linkedin: "https://www.linkedin.com/in/tanvi-herwadkar-a29847218",
    github: "https://github.com/tanviherwadkar"
  },
  {
    name: "Landon Nguyen",
    role: "Product Owner, Frontend Engineer",
    bio: "Landon designed and built the UI/UX for both the web app and Chrome extension, focusing on simplicity and speed. He also acted as the product owner, guiding the overall vision of the project.",
    image: landonImage,
    linkedin: "https://www.linkedin.com/in/landon-nguyen-678555238",
    github: "https://github.com/bamxo"
  }
];

const Carousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [direction, setDirection] = useState<'left' | 'right' | null>(null);
  const [visibleCards, setVisibleCards] = useState(() => getPositionedCards(currentIndex));
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  
  // Touch and mouse handling state
  const startX = useRef<number | null>(null);
  const endX = useRef<number | null>(null);
  const deltaX = useRef<number>(0);
  const startTime = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const velocityX = useRef<number>(0);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const minSwipeDistance = 30; // Reduced from 50 for quicker response
  const minSwipeVelocity = 0.15; // Reduced from 0.2 for easier triggering
  
  // Mouse-specific state
  const [isMouseDown, setIsMouseDown] = useState(false);
  
  // Performance optimization refs
  const rafId = useRef<number | null>(null);
  const lastDragOffset = useRef<number>(0);
  const carouselTrackRef = useRef<HTMLDivElement>(null);
  const lastVelocityUpdate = useRef<number>(0);
  const velocityUpdateInterval = 16; // Update velocity every ~16ms (60fps)
  
  // Animation management
  const animationRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const transitionEndRef = useRef<(() => void) | null>(null);

  // Throttled drag update using requestAnimationFrame for better performance
  const updateDragOffset = useCallback((newOffset: number) => {
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
    }
    
    rafId.current = requestAnimationFrame(() => {
      // Only update if the offset has changed significantly (reduces unnecessary renders)
      if (Math.abs(newOffset - lastDragOffset.current) > 1) {
        lastDragOffset.current = newOffset;
        setDragOffset(newOffset);
        
        // Update CSS custom properties directly for better performance
        if (carouselTrackRef.current) {
          carouselTrackRef.current.style.setProperty('--drag-offset', `${newOffset}px`);
        }
      }
      rafId.current = null;
    });
  }, []);

  function getPositionedCards(centerIndex: number) {
    const cards = [];
    for (let i = -3; i <= 3; i++) {
      let index = centerIndex + i;
      if (index < 0) index = teamMembers.length + index;
      if (index >= teamMembers.length) index = index - teamMembers.length;
      cards.push({ member: teamMembers[index], position: i });
    }
    return cards;
  }

  const nextSlide = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setDirection('right');
    
    const newIndex = currentIndex === teamMembers.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
    
    // Set up the animation end handler with the new index
    setupTransitionEnd(newIndex);
  }, [isAnimating, currentIndex]);

  const prevSlide = useCallback(() => {
    if (isAnimating) return;
    
    setIsAnimating(true);
    setDirection('left');
    
    const newIndex = currentIndex === 0 ? teamMembers.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    
    // Set up the animation end handler with the new index
    setupTransitionEnd(newIndex);
  }, [isAnimating, currentIndex]);

  // Setup the transition end timer and handler
  const setupTransitionEnd = (targetIndex: number) => {
    // Clear any existing animation frame or timeout
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
      animationTimeoutRef.current = null;
    }
    
    // Create a new transition end handler
    const handleTransitionEnd = () => {
      setVisibleCards(getPositionedCards(targetIndex));
      setIsAnimating(false);
      setDirection(null);
      
      // Clear the refs
      animationRef.current = null;
      transitionEndRef.current = null;
    };
    
    transitionEndRef.current = handleTransitionEnd;
    
    // Reduced timeout to allow for quicker successive swipes
    // CSS transition is 400ms, we complete state change much earlier for responsiveness
    animationTimeoutRef.current = setTimeout(() => {
      if (transitionEndRef.current) {
        transitionEndRef.current();
      }
    }, 250); // Reduced from 500ms to 250ms for quicker response
  };

  // Clean up animation timers on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  // Update visible cards when currentIndex changes and we're not animating
  useEffect(() => {
    if (!isAnimating) {
      setVisibleCards(getPositionedCards(currentIndex));
    }
  }, [currentIndex, isAnimating]);

  // Handle auto-scrolling
  useEffect(() => {
    let autoScrollTimer: NodeJS.Timeout;

    const startAutoScroll = () => {
      autoScrollTimer = setInterval(() => {
        if (!autoScrollPaused) {
          nextSlide();
        }
      }, 5000); // Auto scroll every 5 seconds
    };

    startAutoScroll();

    // Cleanup function
    return () => {
      clearInterval(autoScrollTimer);
    };
  }, [nextSlide, autoScrollPaused]);

  // Touch event handlers for swipe functionality
  const handleTouchStart = (e: TouchEvent) => {
    // If we're in the middle of an animation, force complete it immediately
    if (isAnimating) {
      // Clear any pending animation timers
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      
      // If there's a transition end handler, call it to complete the transition
      if (transitionEndRef.current) {
        transitionEndRef.current();
      } else {
        // Fallback: manually complete the animation state
        setVisibleCards(getPositionedCards(currentIndex));
        setIsAnimating(false);
        setDirection(null);
      }
    }
    
    startX.current = e.touches[0].clientX;
    endX.current = startX.current;
    deltaX.current = 0;
    startTime.current = Date.now();
    velocityX.current = 0;
    isDragging.current = true;
    setIsDraggingState(true);
    setDragOffset(0);
    setAutoScrollPaused(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!startX.current || !isDragging.current) return;
    
    const currentTime = Date.now();
    const currentX = e.touches[0].clientX;
    
    // Update position immediately for smooth visual feedback
    endX.current = currentX;
    deltaX.current = endX.current - startX.current;
    updateDragOffset(deltaX.current);
    
    // Throttle velocity calculation for better performance
    if (currentTime - lastVelocityUpdate.current >= velocityUpdateInterval) {
      const previousX = endX.current || startX.current;
      const timeDelta = currentTime - startTime.current;
      
      if (timeDelta > 0) {
        // Calculate instantaneous velocity (pixels per ms)
        velocityX.current = (currentX - previousX) / timeDelta;
      }
      
      lastVelocityUpdate.current = currentTime;
      startTime.current = currentTime;
    }
  };

  const handleTouchEnd = () => {
    if (!startX.current || !endX.current || !isDragging.current) {
      resetTouchState();
      return;
    }

    const distance = startX.current - endX.current;
    const absVelocity = Math.abs(velocityX.current);
    
    // More aggressive swipe detection for quicker response
    const isLeftSwipe = distance > minSwipeDistance || (distance > minSwipeDistance * 0.4 && velocityX.current < -minSwipeVelocity);
    const isRightSwipe = distance < -minSwipeDistance || (distance < -minSwipeDistance * 0.4 && velocityX.current > minSwipeVelocity);
    
    // Determine direction based on distance and velocity
    let swipeResult: 'left' | 'right' | null = null;
    
    // Check high velocity swipes even with smaller distance
    if (absVelocity > minSwipeVelocity * 1.5) { // Reduced from 2x for easier triggering
      swipeResult = velocityX.current > 0 ? 'right' : 'left';
    } 
    // Otherwise use the distance-based approach
    else if (isLeftSwipe) {
      swipeResult = 'left';
    } else if (isRightSwipe) {
      swipeResult = 'right';
    }
    
    // Apply bounce-back animation if not enough momentum to trigger a slide
    if (!swipeResult) {
      // If we're not changing slides, animate the drag offset back to 0
      // This is handled by CSS transition added to .card:not(.dragging)
      setDragOffset(0);
      setTimeout(() => resetTouchState(), 200); // Reduced from 300ms for quicker response
    } else {
      // Set direction for animated transition
      if (swipeResult === 'left') {
        nextSlide();
      } else {
        prevSlide();
      }
      
      // Reset touch state immediately for next swipe
      resetTouchState();
    }

    // Resume auto-scrolling after 8 seconds
    setTimeout(() => {
      setAutoScrollPaused(false);
    }, 8000);
  };

  // Helper to reset touch state
  const resetTouchState = () => {
    startX.current = null;
    endX.current = null;
    deltaX.current = 0;
    isDragging.current = false;
    setIsDraggingState(false);
    setDragOffset(0);
    setIsMouseDown(false);
    lastDragOffset.current = 0;
    
    // Cancel any pending animation frames
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    
    // Reset CSS custom property
    if (carouselTrackRef.current) {
      carouselTrackRef.current.style.removeProperty('--drag-offset');
    }
  };

  // Cancel swipe on touch cancel
  const handleTouchCancel = () => {
    resetTouchState();
    
    // Resume auto-scrolling after a delay
    setTimeout(() => {
      setAutoScrollPaused(false);
    }, 8000);
  };

  // Handle navigation click pause
  const handleNavClick = (direction: 'prev' | 'next') => {
    setAutoScrollPaused(true);
    
    if (direction === 'prev') {
      prevSlide();
    } else {
      nextSlide();
    }

    // Resume auto-scrolling after 8 seconds
    setTimeout(() => {
      setAutoScrollPaused(false);
    }, 8000);
  };

  // Handle global mouse events for better dragging experience
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!startX.current || !isDragging.current || !isMouseDown) return;
      
      const currentTime = Date.now();
      const currentX = e.clientX;
      
      // Update position immediately for smooth visual feedback
      endX.current = currentX;
      deltaX.current = endX.current - startX.current;
      updateDragOffset(deltaX.current);
      
      // Throttle velocity calculation for better performance
      if (currentTime - lastVelocityUpdate.current >= velocityUpdateInterval) {
        const previousX = endX.current || startX.current;
        const timeDelta = currentTime - startTime.current;
        
        if (timeDelta > 0) {
          // Calculate instantaneous velocity (pixels per ms)
          velocityX.current = (currentX - previousX) / timeDelta;
        }
        
        lastVelocityUpdate.current = currentTime;
        startTime.current = currentTime;
      }
    };

    const handleGlobalMouseUp = () => {
      if (isMouseDown && isDragging.current) {
        handleMouseUp();
      }
    };

    if (isMouseDown) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isMouseDown, updateDragOffset]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnimating) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          prevSlide();
          setAutoScrollPaused(true);
          // Resume auto-scrolling after 8 seconds
          setTimeout(() => setAutoScrollPaused(false), 8000);
          break;
        case 'ArrowRight':
          nextSlide();
          setAutoScrollPaused(true);
          // Resume auto-scrolling after 8 seconds
          setTimeout(() => setAutoScrollPaused(false), 8000);
          break;
        default:
          break;
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown as any);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown as any);
    };
  }, [isAnimating, nextSlide, prevSlide]);

  const getCardStyle = useCallback((position: number) => {
    if (!isDraggingState || dragOffset === 0) {
      return undefined; // Use default styling when not swiping
    }
    
    // Pre-calculate drag factors for better performance
    const dragFactors = {
      0: 0.8,   // Center card
      1: 0.25,  // Adjacent cards
      '-1': 0.25,
      2: 0.1,   // Outer cards
      '-2': 0.1
    };
    
    const dragFactor = dragFactors[position as keyof typeof dragFactors];
    if (dragFactor === undefined) {
      return undefined; // Other cards don't move with drag
    }
    
    // Calculate the drag amount based on position and factor
    const dragAmount = dragOffset * dragFactor;
    
    // Pre-calculated base values for better performance
    const baseValues = {
      0: { scale: 1, rotateY: 0, translateX: 0 },
      1: { scale: 0.8, rotateY: -5, translateX: 100 },
      '-1': { scale: 0.8, rotateY: 5, translateX: -100 },
      2: { scale: 0.6, rotateY: -10, translateX: 200 },
      '-2': { scale: 0.6, rotateY: 10, translateX: -200 }
    };
    
    const base = baseValues[position as keyof typeof baseValues];
    if (!base) return undefined;
    
    // Apply small scale increase when dragging the center card
    const scaleBoost = position === 0 ? 0.02 : 0;
    
    // For center card, apply slight rotation based on drag direction (clamped for performance)
    const rotationAdjustment = position === 0 && dragOffset !== 0 
      ? Math.max(-3, Math.min(3, dragOffset * 0.01))
      : 0;
    
    // Use transform3d for better GPU acceleration
    const transform = `translate3d(calc(${base.translateX}% + ${dragAmount}px), 0, 0) scale(${base.scale + scaleBoost}) rotateY(${base.rotateY + rotationAdjustment}deg)`;
    
    // Simplified box shadow calculation for center card only
    const style: React.CSSProperties = { transform };
    
    if (position === 0) {
      const shadowIntensity = Math.min(Math.abs(dragOffset) * 0.001, 0.1);
      style.boxShadow = `0 ${10 + Math.abs(dragOffset) * 0.02}px ${30 + Math.abs(dragOffset) * 0.05}px rgba(0, 0, 0, ${0.3 + shadowIntensity})`;
    }
    
    return style;
  }, [isDraggingState, dragOffset]);

  // Mouse event handlers for desktop dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent default to avoid text selection and other browser behaviors
    e.preventDefault();
    
    // If we're in the middle of an animation, force complete it immediately
    if (isAnimating) {
      // Clear any pending animation timers
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
        animationTimeoutRef.current = null;
      }
      
      // If there's a transition end handler, call it to complete the transition
      if (transitionEndRef.current) {
        transitionEndRef.current();
      } else {
        // Fallback: manually complete the animation state
        setVisibleCards(getPositionedCards(currentIndex));
        setIsAnimating(false);
        setDirection(null);
      }
    }
    
    startX.current = e.clientX;
    endX.current = startX.current;
    deltaX.current = 0;
    startTime.current = Date.now();
    velocityX.current = 0;
    isDragging.current = true;
    setIsDraggingState(true);
    setIsMouseDown(true);
    setDragOffset(0);
    setAutoScrollPaused(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!startX.current || !isDragging.current || !isMouseDown) return;
    
    const currentTime = Date.now();
    const currentX = e.clientX;
    
    // Update position immediately for smooth visual feedback
    endX.current = currentX;
    deltaX.current = endX.current - startX.current;
    updateDragOffset(deltaX.current);
    
    // Throttle velocity calculation for better performance
    if (currentTime - lastVelocityUpdate.current >= velocityUpdateInterval) {
      const previousX = endX.current || startX.current;
      const timeDelta = currentTime - startTime.current;
      
      if (timeDelta > 0) {
        // Calculate instantaneous velocity (pixels per ms)
        velocityX.current = (currentX - previousX) / timeDelta;
      }
      
      lastVelocityUpdate.current = currentTime;
      startTime.current = currentTime;
    }
  };

  const handleMouseUp = () => {
    if (!startX.current || !endX.current || !isDragging.current) {
      resetTouchState();
      return;
    }

    const distance = startX.current - endX.current;
    const absVelocity = Math.abs(velocityX.current);
    
    // More aggressive swipe detection for quicker response
    const isLeftSwipe = distance > minSwipeDistance || (distance > minSwipeDistance * 0.4 && velocityX.current < -minSwipeVelocity);
    const isRightSwipe = distance < -minSwipeDistance || (distance < -minSwipeDistance * 0.4 && velocityX.current > minSwipeVelocity);
    
    // Determine direction based on distance and velocity
    let swipeResult: 'left' | 'right' | null = null;
    
    // Check high velocity swipes even with smaller distance
    if (absVelocity > minSwipeVelocity * 1.5) { // Reduced from 2x for easier triggering
      swipeResult = velocityX.current > 0 ? 'right' : 'left';
    } 
    // Otherwise use the distance-based approach
    else if (isLeftSwipe) {
      swipeResult = 'left';
    } else if (isRightSwipe) {
      swipeResult = 'right';
    }
    
    // Apply bounce-back animation if not enough momentum to trigger a slide
    if (!swipeResult) {
      // If we're not changing slides, animate the drag offset back to 0
      setDragOffset(0);
      setTimeout(() => resetTouchState(), 200); // Reduced from 300ms for quicker response
    } else {
      // Set direction for animated transition
      if (swipeResult === 'left') {
        nextSlide();
      } else {
        prevSlide();
      }
      
      // Reset state immediately for next swipe
      resetTouchState();
    }

    // Resume auto-scrolling after 8 seconds
    setTimeout(() => {
      setAutoScrollPaused(false);
    }, 8000);
  };

  const handleMouseLeave = () => {
    // If the mouse leaves the carousel area while dragging, treat it as mouse up
    if (isMouseDown && isDragging.current) {
      handleMouseUp();
    }
  };

  return (
    <div 
      className={styles.carouselContainer}
      role="region"
      aria-label="Team members carousel"
      tabIndex={0}
    >
      <div 
        ref={carouselTrackRef}
        className={`
          ${styles.carouselTrack}
          ${isAnimating && direction === 'right' ? styles.animateRight : ''}
          ${isAnimating && direction === 'left' ? styles.animateLeft : ''}
          ${isDraggingState ? styles.swiping : ''}
        `}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        aria-live="polite"
      >
        {visibleCards.map(({ member, position }, index) => (
          <div
            key={`${member.name}-${index}-${position}`}
            className={`
              ${styles.card} 
              ${styles[`position${position}`] || styles.positionOutside}
              ${position === 0 && isDraggingState ? styles.dragging : ''}
            `}
            style={getCardStyle(position)}
            aria-hidden={position !== 0} // Only the center card is not hidden from screen readers
            role={position === 0 ? "group" : undefined}
            aria-roledescription={position === 0 ? "slide" : undefined}
            aria-label={position === 0 ? `${member.name}, ${member.role}` : undefined}
          >
            <div className={styles.cardContent}>
              <div className={styles.imageContainer}>
                <img src={member.image} alt={member.name} className={styles.memberImage} />
              </div>
              <h3 className={styles.memberName}>{member.name}</h3>
              <h4 className={styles.memberRole}>{member.role}</h4>
              <p className={styles.memberBio}>{member.bio}</p>
              <div className={styles.socialLinks}>
                {member.linkedin && (
                  <a 
                    href={member.linkedin} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    aria-label={`${member.name}'s LinkedIn profile`}
                    className={styles.socialLink}
                  >
                    <FaLinkedin size={20} />
                  </a>
                )}
                {member.github && (
                  <a 
                    href={member.github} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    aria-label={`${member.name}'s GitHub profile`}
                    className={styles.socialLink}
                  >
                    <FaGithub size={20} />
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <button 
          className={`${styles.navButton} ${styles.prevButton}`} 
          onClick={() => handleNavClick('prev')}
          disabled={isAnimating}
          aria-label="Previous slide"
        >
          <FaChevronLeft />
        </button>
        <button 
          className={`${styles.navButton} ${styles.nextButton}`} 
          onClick={() => handleNavClick('next')}
          disabled={isAnimating}
          aria-label="Next slide"
        >
          <FaChevronRight />
        </button>
      </div>
      
      {/* Screen reader info */}
      <div className="sr-only" aria-live="polite">
        Showing slide {currentIndex + 1} of {teamMembers.length}
      </div>
    </div>
  );
};

export default Carousel; 